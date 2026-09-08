const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;

exports.handler = async (event) => {
  try {
    const dept = event.pathParameters?.dept || 'GOPD';
    const today = new Date().toISOString().split('T')[0];

    // Query for first patient in queue (emergency first, then FIFO)
    const queryResult = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'DEPT#GOPD#DATE#' + today
      },
      ScanIndexForward: true,
      Limit: 1
    }).promise();

    if (queryResult.Items.length === 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'QUEUE_EMPTY', message: 'No patients waiting' })
      };
    }

    const nextPatient = queryResult.Items[0];
    const newVersion = (nextPatient.version || 0) + 1;

    // Update patient status to CALLED
    await dynamodb.update({
      TableName: TABLE,
      Key: {
        PK: nextPatient.PK,
        SK: nextPatient.SK
      },
      UpdateExpression: 'SET #status = :status, #version = :version, #updatedAt = :now, #updatedBy = :doctor',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#version': 'version',
        '#updatedAt': 'lastUpdatedAt',
        '#updatedBy': 'lastUpdatedBy'
      },
      ExpressionAttributeValues: {
        ':status': 'CALLED',
        ':version': newVersion,
        ':now': new Date().toISOString(),
        ':doctor': 'DOCTOR'
      }
    }).promise();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calledPatient: {
          patientId: nextPatient.patientId,
          name: nextPatient.name,
          phone: nextPatient.phone,
          patientType: nextPatient.patientType,
          currentStage: nextPatient.currentStage,
          status: 'CALLED'
        },
        message: 'Patient called successfully'
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