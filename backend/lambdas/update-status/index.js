const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

// Define pathway stages for each patient type
const PATHWAYS = {
  NHIA: ['CHECKED_IN', 'VERIFICATION', 'CONSULTATION', 'PHARMACY', 'COMPLETED'],
  HMO: ['CHECKED_IN', 'VERIFICATION', 'APPROVAL', 'CONSULTATION', 'COMPLETED'],
  CASH: ['CHECKED_IN', 'REGISTRATION', 'PAYMENT', 'CONSULTATION', 'COMPLETED'],
  EMERGENCY: ['CHECKED_IN', 'TRIAGE', 'CONSULTATION', 'COMPLETED']
};

exports.handler = async (event) => {
  try {
    const patientId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');
    const { expectedVersion } = body;

    if (!patientId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing patientId' })
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const PK = 'DEPT#GOPD#DATE#' + today;

    // Find patient by querying all patients for today
    const queryResult = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': PK
      }
    }).promise();

    const patient = queryResult.Items.find(item => item.patientId === patientId);

    if (!patient) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'PATIENT_NOT_FOUND' })
      };
    }

    // Optimistic concurrency check
    if (expectedVersion && patient.version !== expectedVersion) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: 'VERSION_CONFLICT',
          message: 'Patient data changed. Please refresh.',
          currentVersion: patient.version
        })
      };
    }

    // Get pathway for this patient type
    const pathway = PATHWAYS[patient.patientType] || PATHWAYS.CASH;
    const currentIndex = pathway.indexOf(patient.currentStage);

    // Move to next stage
    if (currentIndex === -1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'INVALID_STAGE', message: 'Current stage not in pathway' })
      };
    }

    if (currentIndex >= pathway.length - 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ALREADY_COMPLETED' })
      };
    }

    const nextStage = pathway[currentIndex + 1];
    const newVersion = (patient.version || 0) + 1;

    // Update patient
    const updateResult = await dynamodb.update({
      TableName: TABLE,
      Key: {
        PK: patient.PK,
        SK: patient.SK
      },
      UpdateExpression: 'SET currentStage = :stage, #status = :status, #version = :version, lastUpdatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#version': 'version'
      },
      ExpressionAttributeValues: {
        ':stage': nextStage,
        ':status': nextStage === pathway[pathway.length - 1] ? 'COMPLETED' : 'IN_PROGRESS',
        ':version': newVersion,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        previousStage: patient.currentStage,
        currentStage: nextStage,
        status: nextStage === pathway[pathway.length - 1] ? 'COMPLETED' : 'IN_PROGRESS',
        version: newVersion,
        message: 'Patient progressed to next stage'
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