"use strict";
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const permit = require("../../init_permit");
const {
  assignResourceInstanceRoleToUser,
} = require("../helper_functions/assign_resource_instance_to_users");

module.exports.createDocument = async (event) => {
  try {
    const body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body, "base64").toString())
      : JSON.parse(event.body);
    const userId = event.requestContext.authorizer.userId;
    const userEmail = event.requestContext.authorizer.email;
    const department = event.requestContext.authorizer.department;
    const documentId = uuidv4();
    const folderId = body.folderId;
    const PK = folderId ? `FOLDER#${folderId}` : `DOCUMENT#${documentId}`;
    const SK = folderId ? `DOCUMENT#${documentId}` : "METADATA";

    const timestamp = new Date().toISOString();
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const resourceAttributes = {
      department: department,
    };

    const checkPermission = await permit.check(userEmail, "create", {
      type: "Document",
      attributes: resourceAttributes,
    });

    if (!checkPermission) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: "Permission denied",
      };
    }

    const document = {
      PK: PK,
      SK: SK,
      name: body.name,
      department: department,
      ownerId: userId,
      createdAt: timestamp,
    };

    const params = {
      TableName: process.env.FOLDER_DOCUMENTS_TABLE,
      Item: document,
    };
    await dynamoDB.put(params).promise();

    const createdInstance = await permit.api.resourceInstances.create({
      key: documentId,
      tenant: "default",
      resource: "Document",
      attributes: resourceAttributes,
    });

    console.log("CREATED INSTANCE:", createdInstance);

    if (!createdInstance) {
      throw new Error("Failed to create resource instance or missing result");
    }

    if (folderId) {
      await permit.api.relationshipTuples.create({
        subject: `Folder:${folderId}`,
        relation: "parent",
        object: `Document:${createdInstance.key}`,
      });
      console.log("PARENT-CHILD RELATIONSHIP CREATED");
      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
      };
    }
    const assignedRole = await assignResourceInstanceRoleToUser(
      userEmail,
      "owner",
      `Document:${createdInstance.key}`
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
