const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;
const MINUTES_PER_PATIENT = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

const today = () => new Date().toISOString().split('T')[0];

async function fetchWaiting(date) {
  const items = [];
  let lastKey;
  do {
    const res = await dynamodb.query({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `DEPT#GOPD#DATE#${date}#QUEUE` },
      ScanIndexForward: true,
      ExclusiveStartKey: lastKey
    }).promise();
    items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return items.filter((item) => item.status === 'CHECKED_IN');
}

exports.handler = async (event) => {
  try {
    const patientId = event.pathParameters && event.pathParameters.id;
    if (!patientId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'MISSING_PATIENT_ID', message: 'Patient ID is required' })
      };
    }

    const date = today();

    // Find this patient's encounters for today
    const todays = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `DEPT#GOPD#DATE#${date}`,
        ':sk': 'PATIENT#'
      }
    }).promise();

    // If the patient has more than one visit today, use the most recent
    const visits = todays.Items
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (visits.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'PATIENT_NOT_FOUND', message: 'No check-in found for this patient today' })
      };
    }

    const visit = visits[0];

    // Real queue position: index in the priority-ordered waiting list
    let position = null;
    let estimatedWaitMinutes = 0;
    if (visit.status === 'CHECKED_IN') {
      const waiting = await fetchWaiting(date);
      const idx = waiting.findIndex((item) => item.patientId === patientId);
      if (idx >= 0) {
        position = idx + 1;
        estimatedWaitMinutes = idx * MINUTES_PER_PATIENT;
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        patientId,
        cardNumber: visit.cardNumber || null,
        name: visit.displayName,
        phone: visit.phone,
        patientType: visit.patientType,
        urgency: visit.urgency,
        queueNumber: visit.queueNumber,
        currentStage: visit.currentStage,
        status: visit.status,
        version: visit.version,
        position,
        estimatedWaitMinutes,
        message: 'Patient status retrieved'
      })
    };
  } catch (error) {
    console.error('Error in GetPatient:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message })
    };
  }
};