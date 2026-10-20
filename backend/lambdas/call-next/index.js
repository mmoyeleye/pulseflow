const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

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

exports.handler = async () => {
  try {
    const date = today();
    const waiting = await fetchWaiting(date);

    if (waiting.length === 0) {
      return respond(409, { error: 'QUEUE_EMPTY', message: 'No patients are waiting' });
    }

    // Call the first waiting patient. The condition means that if another staff member
    // has just called this patient, the update fails and we move to the next one.
    for (const candidate of waiting) {
      try {
        const result = await dynamodb.update({
          TableName: TABLE,
          Key: { PK: candidate.PK, SK: candidate.SK },
          UpdateExpression: 'SET #status = :called, lastUpdatedAt = :now, lastUpdatedBy = :by ADD version :one',
          ConditionExpression: '#status = :waiting',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':called': 'CALLED',
            ':waiting': 'CHECKED_IN',
            ':now': new Date().toISOString(),
            ':by': 'STAFF',
            ':one': 1
          },
          ReturnValues: 'ALL_NEW'
        }).promise();

        const p = result.Attributes;
        return respond(200, {
          success: true,
          patientId: p.patientId,
          name: p.displayName,
          cardNumber: p.cardNumber || null,
          patientType: p.patientType,
          urgency: p.urgency,
          queueNumber: p.queueNumber,
          status: 'CALLED',
          version: p.version,
          message: `Called ${p.displayName}`
        });
      } catch (err) {
        if (err.code !== 'ConditionalCheckFailedException') throw err;
        // Already called by someone else; try the next patient
      }
    }

    return respond(409, { error: 'QUEUE_EMPTY', message: 'No patients are waiting' });
  } catch (error) {
    console.error('Error in CallNext:', error);
    return respond(500, { error: 'INTERNAL_ERROR', message: error.message });
  }
};