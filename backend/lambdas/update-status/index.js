const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

// These must match what check-in Lambda sets!
const PATHWAYS = {
  NHIA: ['VERIFICATION', 'CONSULTATION', 'PHARMACY', 'COMPLETED'],
  HMO: ['VERIFICATION', 'APPROVAL', 'CONSULTATION', 'COMPLETED'],
  CASH: ['REGISTRATION', 'PAYMENT', 'CONSULTATION', 'COMPLETED'],
  EMERGENCY: ['TRIAGE', 'CONSULTATION', 'COMPLETED']
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

    console.log('Patient: ' + patientId);
    console.log('Type: ' + patient.patientType);
    console.log('Current Stage: ' + patient.currentStage);
    console.log('Pathway: ' + JSON.stringify(pathway));
    console.log('Current Index: ' + currentIndex);

    if (currentIndex === -1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'INVALID_STAGE',
          message: 'Current stage not found in pathway',
          currentStage: patient.currentStage,
          pathway: pathway
        })
      };
    }

    if (currentIndex >= pathway.length - 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'ALREADY_AT_FINAL_STAGE',
          message: 'Patient has completed pathway'
        })
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
        patientType: patient.patientType,
        previousStage: patient.currentStage,
        currentStage: nextStage,
        message: 'Patient progressed successfully'
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