const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ENCOUNTERS_TABLE = process.env.ENCOUNTERS_TABLE;
const EVENTS_TABLE = process.env.EVENTS_TABLE;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { events } = body;

    if (!events || events.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No events to sync' })
      };
    }

    const results = [];

    for (const event of events) {
      try {
        // Store event
        await dynamodb.put({
          TableName: EVENTS_TABLE,
          Item: {
            eventId: event.eventId || 'evt-' + Date.now(),
            encounterId: event.encounterId,
            eventType: event.eventType,
            payload: event.payload,
            createdAtDevice: event.createdAtDevice,
            syncedAt: new Date().toISOString(),
            syncStatus: 'SYNCED'
          }
        }).promise();

        results.push({
          eventId: event.eventId,
          status: 'SYNCED'
        });
      } catch (error) {
        results.push({
          eventId: event.eventId,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        synced: results.length,
        results: results
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