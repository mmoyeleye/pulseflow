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

// Every waiting patient for a date, in priority order (emergency first, then FIFO).
// Reads all pages and keeps only CHECKED_IN patients: CALLED and COMPLETED ones stay in the
// index but are no longer waiting.
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

exports.handler = async () => {
  try {
    const date = today();
    const waiting = await fetchWaiting(date);

    const queue = waiting.map((item, idx) => ({
      patientId: item.patientId,
      queueNumber: item.queueNumber,
      name: item.displayName,
      phone: item.phone,
      cardNumber: item.cardNumber || null,
      patientType: item.patientType,
      urgency: item.urgency,
      currentStage: item.currentStage,
      status: item.status,
      position: idx + 1,
      estimatedWaitMinutes: idx * MINUTES_PER_PATIENT
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        department: 'GOPD',
        date,
        queueLength: queue.length,
        queue,
        message: `Queue contains ${queue.length} waiting patients`
      })
    };
  } catch (error) {
    console.error('Error in GetQueue:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message })
    };
  }
};