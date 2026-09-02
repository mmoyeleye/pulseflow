const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  console.log("Lambda function called");
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Placeholder response - will implement in Day 6-7
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Lambda endpoint placeholder (not implemented yet)",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
