const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

const PATHWAYS = {
  NHIA: ['CHECKED_IN', 'VERIFICATION', 'CONSULTATION', 'COMPLETED'],
  HMO: ['CHECKED_IN', 'VERIFICATION', 'CONSULTATION', 'COMPLETED'],
  CASH: ['CHECKED_IN', 'REGISTRATION', 'CONSULTATION', 'COMPLETED'],
  EMERGENCY: ['CHECKED_IN', 'TRIAGE', 'CONSULTATION', 'COMPLETED']
};

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

    const pathway = PATHWAYS[patient.patientType] || PATHWAYS.CASH;
    const currentIndex = pathway.indexOf(patient.currentStage);

    if (currentIndex === -1 || currentIndex >= pathway.length - 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'CANNOT_PROGRESS' })
      };
    }

    const nextStage = pathway[currentIndex + 1];

    await dynamodb.update({
      TableName: TABLE,
      Key: {
        PK: patient.PK,
        SK: patient.SK
      },
      UpdateExpression: 'SET currentStage = :stage',
      ExpressionAttributeValues: {
        ':stage': nextStage
      }
    }).promise();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        previousStage: patient.currentStage,
        currentStage: nextStage,
        message: 'Patient progressed'
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