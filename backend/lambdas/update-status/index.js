const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ENCOUNTERS_TABLE;
const DEPT = 'GOPD';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

// Same UTC date the check-in and queue Lambdas use
const today = () => new Date().toISOString().split('T')[0];

exports.handler = async (event) => {
  try {
    const patientId = event.pathParameters && event.pathParameters.id;
    if (!patientId) {
      return respond(400, { error: 'MISSING_PATIENT_ID', message: 'Patient ID is required' });
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return respond(400, { error: 'INVALID_JSON', message: 'Request body must be valid JSON' });
    }

    const { expectedVersion, status } = body;
    if (status !== 'COMPLETED') {
      return respond(400, { error: 'INVALID_STATUS', message: 'Only COMPLETED is supported here' });
    }
    if (typeof expectedVersion !== 'number') {
      return respond(400, { error: 'MISSING_VERSION', message: 'expectedVersion is required' });
    }

    const visits = await dynamodb.query({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `DEPT#${DEPT}#DATE#${today()}`,
        ':sk': 'PATIENT#'
      }
    }).promise();

    const visit = visits.Items.find(
      (item) => item.patientId === patientId && item.status === 'CALLED'
    );
    if (!visit) {
      return respond(404, { error: 'PATIENT_NOT_CALLED', message: 'No called visit found for this patient today' });
    }

    try {
      const result = await dynamodb.update({
        TableName: TABLE,
        Key: { PK: visit.PK, SK: visit.SK },
        UpdateExpression:
          'SET #status = :completed, currentStage = :completed, lastUpdatedAt = :now, lastUpdatedBy = :by ADD version :one',
        ConditionExpression: '#status = :called AND version = :expected',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':completed': 'COMPLETED',
          ':called': 'CALLED',
          ':expected': expectedVersion,
          ':now': new Date().toISOString(),
          ':by': 'STAFF',
          ':one': 1
        },
        ReturnValues: 'ALL_NEW'
      }).promise();

      return respond(200, {
        success: true,
        patientId,
        name: result.Attributes.displayName,
        status: 'COMPLETED',
        version: result.Attributes.version,
        message: `Consultation completed for ${result.Attributes.displayName}`
      });
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        return respond(409, {
          error: 'VERSION_CONFLICT',
          message: 'This record changed since it was called. Refresh the queue and try again.'
        });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error in UpdateStatus Lambda:', error);
    return respond(500, { error: 'INTERNAL_ERROR', message: 'Could not update status, please try again' });
  }
};