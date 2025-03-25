const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const {
  syncUserWithPermit,
} = require("../helper_functions/assign_resource_instance_to_users");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.USERS_TABLE;

exports.handler = async (event) => {
  try {
    const { email, password, department, classification } = JSON.parse(
      event.body
    );

    if (!email || !password || !department) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      email,
      password: hashedPassword,
      department,
      classification: classification || "regular",
      createdAt: new Date().toISOString(),
    };

    await dynamoDb.put({ TableName: TABLE_NAME, Item: user }).promise();

    await syncUserWithPermit({
      email: email,
      key: email,
      attributes: {
        department: department,
        classification: classification || "regular",
      },
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User registered successfully" }),
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
