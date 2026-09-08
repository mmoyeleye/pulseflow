const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

exports.handler = async (event) => {
  try {
    const dept = 'GOPD';
    const today = new Date().toISOString().split('T')[0];

    const queryResult = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'DEPT#GOPD#DATE#' + today
      },
      Limit: 1
    }).promise();

    if (queryResult.Items.length === 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'QUEUE_EMPTY' })
      };
    }

    const nextPatient = queryResult.Items[0];

    await dynamodb.update({
      TableName: TABLE,
      Key: {
        PK: nextPatient.PK,
        SK: nextPatient.SK
      },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'CALLED'
      }
    }).promise();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: nextPatient.patientId,
        name: nextPatient.name,
        status: 'CALLED',
        message: 'Patient called'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};