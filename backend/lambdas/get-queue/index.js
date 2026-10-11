const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('GetQueue called');
  
  try {
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    const dept = 'GOPD';
    const today = new Date().toISOString().split('T')[0];

    const queryResult = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'DEPT#GOPD#DATE#' + today
      }
    }).promise();

    const queue = queryResult.Items.map((item, idx) => ({
      patientId: item.patientId,
      name: item.name,
      phone: item.phone,
      patientType: item.patientType,
      currentStage: item.currentStage,
      status: item.status,
      position: idx + 1,
      estimatedWaitMinutes: idx * 10
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        queueLength: queue.length,
        queue: queue
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};