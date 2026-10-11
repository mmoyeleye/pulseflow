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
  console.log('GetPatient called');
  
  try {
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    const patientId = event.pathParameters?.id;

    if (!patientId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing patientId' })
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const PK = 'DEPT#GOPD#DATE#' + today;

    const queryResult = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': PK
      }
    }).promise();

    const patient = queryResult.Items.find(function(item) {
      return item.patientId === patientId;
    });

    if (!patient) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'PATIENT_NOT_FOUND' })
      };
    }

    const position = 1;
    const estimatedWait = 0;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        patientId: patientId,
        name: patient.name,
        phone: patient.phone,
        currentStage: patient.currentStage,
        status: patient.status,
        position: position,
        estimatedWaitMinutes: estimatedWait,
        message: 'Patient status retrieved'
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