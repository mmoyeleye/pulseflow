const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

exports.handler = async (event) => {
  try {
    const dept = event.pathParameters?.dept || 'GOPD';
    const today = new Date().toISOString().split('T')[0];

    const result = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'DEPT#GOPD#DATE#' + today
      }
    }).promise();

    const queue = result.Items.map((item, idx) => ({
      patientId: item.patientId,
      name: item.name,
      phone: item.phone,
      patientType: item.patientType,
      status: item.status,
      position: idx + 1
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queueLength: queue.length,
        queue: queue
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