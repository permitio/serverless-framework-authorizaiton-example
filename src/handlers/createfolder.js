"use strict";
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const permit = require("../../init_permit");
const {
  assignResourceInstanceRoleToUser,
} = require("../helper_functions/assign_resource_instance_to_users");

module.exports.createfolder = async (event) => {
  try {
    const body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body, "base64").toString())
      : JSON.parse(event.body);
    const userId = event.requestContext.authorizer.userId;
    const userEmail = event.requestContext.authorizer.email;
    const folderId = uuidv4();
    const timestamp = new Date().toISOString();
    const dynamoDB = new AWS.DynamoDB.DocumentClient();

    const document = {
      PK: `FOLDER#${folderId}`,
      SK: "FOLDER",
      name: body.name,
      ownerId: userId,
      createdAt: timestamp,
    };

    const params = {
      TableName: process.env.FOLDER_DOCUMENTS_TABLE,
      Item: document,
    };
    await dynamoDB.put(params).promise();

    const createdInstance = await permit.api.resourceInstances.create({
      key: folderId,
      tenant: "default",
      resource: "Folder",
    });
    console.log("CREATED INSTANCE:", createdInstance);

    if (!createdInstance) {
      throw new Error("Failed to create resource instance or missing result");
    }
    const assignedRole = await assignResourceInstanceRoleToUser(
      userEmail,
      "admin",
      `Folder:${createdInstance.key}`
    );
    console.log("ASSIGNED ROLE:", assignedRole);
    if (!assignedRole) {
      throw new Error("Failed to set up folder permissions");
    }
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document),
    };
  } catch (error) {
    console.error("Error creating document:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Error creating document" }),
    };
  }
};
