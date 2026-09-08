const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, phone, patientType } = body;
    
    if (!name || !phone || !patientType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing fields' })
      };
    }

    const patientId = 'pat-' + Date.now();
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    const PK = 'DEPT#GOPD#DATE#' + today;
    const SK = 'PATIENT#' + patientId;

    // Determine initial stage based on patient type
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

    await dynamodb.put({
      TableName: TABLE,
      Item: item
    }).promise();

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        currentStage: currentStage,
        status: 'CHECKED_IN',
        message: 'Patient registered'
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