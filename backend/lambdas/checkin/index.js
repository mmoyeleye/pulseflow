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
  console.log('Event received:', JSON.stringify(event));
  
  try {
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Parse body - handle both string and object
    let body = event.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    console.log('Parsed body:', JSON.stringify(body));

    const { name, phone, patientType } = body;
    
    console.log('Fields - name:', name, 'phone:', phone, 'type:', patientType);
    
    if (!name || !phone || !patientType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing fields', received: { name, phone, patientType } })
      };
    }

    const patientId = 'pat-' + Date.now();
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    const PK = 'DEPT#GOPD#DATE#' + today;
    const SK = 'PATIENT#' + patientId;

    let currentStage = 'REGISTRATION';
    if (patientType === 'NHIA' || patientType === 'HMO') {
      currentStage = 'VERIFICATION';
    } else if (patientType === 'EMERGENCY') {
      currentStage = 'TRIAGE';
    }

    const item = {
      PK: PK,
      SK: SK,
      patientId: patientId,
      name: name,
      phone: phone,
      patientType: patientType,
      currentStage: currentStage,
      status: 'CHECKED_IN',
      createdAt: timestamp
    };

    console.log('Writing item to DynamoDB:', JSON.stringify(item));

    await dynamodb.put({
      TableName: TABLE,
      Item: item
    }).promise();

    console.log('Success - patient registered:', patientId);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        patientId: patientId,
        currentStage: currentStage,
        status: 'CHECKED_IN',
        message: 'Patient registered'
      })
    };

  } catch (error) {
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message,
        type: error.constructor.name
      })
    };
  }
};