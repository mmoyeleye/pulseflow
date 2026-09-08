const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

exports.handler = async (event) => {
  try {
    const patientId = event.pathParameters.id;

    if (!patientId) {
      return {
        statusCode: 400,
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
        body: JSON.stringify({ error: 'PATIENT_NOT_FOUND' })
      };
    }

    const position = 1;
    const estimatedWait = 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        name: patient.name,
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
      body: JSON.stringify({ error: error.message })
    };
  }
};