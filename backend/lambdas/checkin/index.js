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
    
    const item = {
      PK: 'DEPT#GOPD#DATE#' + today,
      SK: 'PATIENT#' + patientId,
      patientId: patientId,
      name: name,
      phone: phone,
      patientType: patientType,
      status: 'CHECKED_IN',
      createdAt: new Date().toISOString()
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