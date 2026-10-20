const AWS = require('aws-sdk');
const https = require('https');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Reuse HTTPS connections to DynamoDB between calls (saves a handshake per request)
AWS.config.update({
  httpOptions: { agent: new https.Agent({ keepAlive: true, maxSockets: 50 }) }
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ENCOUNTERS_TABLE = process.env.ENCOUNTERS_TABLE;
const DEPT = 'GOPD';
const PATIENT_TYPES = ['CASH', 'NHIA', 'HMO', 'EMERGENCY'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s\-()]/g, '');
  const match = digits.match(/^(?:\+?234|0)([789][01]\d{8})$/);
  return match ? '0' + match[1] : null;
}

function normalizeName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 100) return null;
  if (!/^[A-Za-z][A-Za-z '\-.]*$/.test(name)) return null;
  return name;
}

exports.handler = async (event) => {
  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return respond(400, { error: 'INVALID_JSON', message: 'Request body must be valid JSON' });
    }

    const name = normalizeName(body.name);
    if (!name) {
      return respond(400, {
        error: 'INVALID_NAME',
        message: 'Name must be 2 to 100 letters (spaces, apostrophes, hyphens and full stops allowed)'
      });
    }

    const phone = normalizePhone(body.phone);
    if (!phone) {
      return respond(400, {
        error: 'INVALID_PHONE',
        message: 'Enter a valid Nigerian mobile number, for example 08012345678'
      });
    }

    const patientType = body.patientType;
    if (!PATIENT_TYPES.includes(patientType)) {
      return respond(400, {
        error: 'INVALID_PATIENT_TYPE',
        message: `patientType must be one of: ${PATIENT_TYPES.join(', ')}`
      });
    }

    const isEmergency = patientType === 'EMERGENCY' || body.urgency === 'EMERGENCY';
    const urgency = isEmergency ? 'EMERGENCY' : 'ROUTINE';

    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    // The three lookups do not depend on each other, so run them together
    const [active, profileResult, queueNumber] = await Promise.all([
      findActiveCheckIn(today, phone),
      getOrCreateProfile(phone, name),
      getNextQueueNumber(today)
    ]);

    if (active) {
      return respond(409, {
        error: 'DUPLICATE_CHECKIN',
        message: `This patient is already in today's queue (queue #${active.queueNumber})`,
        patientId: active.patientId,
        cardNumber: active.cardNumber,
        queueNumber: active.queueNumber
      });
    }

    const { profile, isNew } = profileResult;

    let pathwayStage = 'REGISTRATION';
    if (patientType === 'NHIA' || patientType === 'HMO') pathwayStage = 'VERIFICATION';
    if (patientType === 'EMERGENCY') pathwayStage = 'TRIAGE';

    const encounter = {
      PK: `DEPT#${DEPT}#DATE#${today}`,
      SK: `PATIENT#${profile.patientId}#${timestamp}`,
      patientId: profile.patientId,
      cardNumber: profile.cardNumber,
      displayName: name,
      phone,
      patientType,
      urgency,
      currentStage: pathwayStage,
      status: 'CHECKED_IN',
      queueNumber,
      queuePriority: isEmergency ? 0 : 1,
      queueSequence: timestamp,
      version: 1,
      createdAt: timestamp,
      lastUpdatedAt: timestamp,
      lastUpdatedBy: 'RECEPTION',
      GSI1PK: `DEPT#${DEPT}#DATE#${today}#QUEUE`,
      GSI1SK: `${isEmergency ? 0 : 1}#${timestamp}`
    };

    await dynamodb.put({ TableName: ENCOUNTERS_TABLE, Item: encounter }).promise();

    console.log(`Checked in ${profile.patientId} (card ${profile.cardNumber}), queue #${queueNumber}`);

    return respond(201, {
      success: true,
      patientId: profile.patientId,
      cardNumber: profile.cardNumber,
      returningPatient: !isNew,
      queueNumber,
      currentStage: pathwayStage,
      status: 'CHECKED_IN',
      urgency,
      message: `Checked in. Queue number: ${queueNumber}`
    });
  } catch (error) {
    console.error('Error in CheckIn Lambda:', error);
    return respond(500, { error: 'INTERNAL_ERROR', message: 'Check-in failed, please try again' });
  }
};

async function findActiveCheckIn(today, phone) {
  const res = await dynamodb.query({
    TableName: ENCOUNTERS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'phone = :phone AND #st <> :done',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':pk': `DEPT#${DEPT}#DATE#${today}`,
      ':sk': 'PATIENT#',
      ':phone': phone,
      ':done': 'COMPLETED'
    }
  }).promise();
  return res.Items && res.Items.length > 0 ? res.Items[0] : null;
}

async function getOrCreateProfile(phone, name) {
  const key = { PK: `PROFILE#${phone}`, SK: 'PROFILE' };

  const existing = await dynamodb.get({ TableName: ENCOUNTERS_TABLE, Key: key }).promise();
  if (existing.Item) return { profile: existing.Item, isNew: false };

  const profile = {
    ...key,
    patientId: uuidv4(),
    cardNumber: generateCardNumber(),
    phone,
    displayName: name,
    createdAt: new Date().toISOString()
  };

  try {
    await dynamodb.put({
      TableName: ENCOUNTERS_TABLE,
      Item: profile,
      ConditionExpression: 'attribute_not_exists(PK)'
    }).promise();
    return { profile, isNew: true };
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      const again = await dynamodb.get({ TableName: ENCOUNTERS_TABLE, Key: key }).promise();
      return { profile: again.Item, isNew: false };
    }
    throw err;
  }
}

function generateCardNumber() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `${DEPT}-${code}`;
}

async function getNextQueueNumber(today) {
  try {
    const result = await dynamodb.update({
      TableName: ENCOUNTERS_TABLE,
      Key: { PK: `DEPT#${DEPT}#DATE#${today}`, SK: 'COUNTER' },
      UpdateExpression: 'SET queueNumber = if_not_exists(queueNumber, :zero) + :inc',
      ExpressionAttributeValues: { ':zero': 0, ':inc': 1 },
      ReturnValues: 'ALL_NEW'
    }).promise();
    return result.Attributes.queueNumber;
  } catch (error) {
    console.error('Error getting queue number:', error);
    return Math.floor(Date.now() / 1000) % 10000;
  }
}