const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const {
  getResourcePermissions,
} = require("../helper_functions/get_resource_permissions");

module.exports.getdocument = (handler) => {
  return async (event, context) => {
    try {
      const documentId = event.pathParameters?.id;
      let resource = null;

      if (documentId) {
        resource = await getResourceById(documentId);

        if (!resource) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: "Resource not found" }),
          };
        }
      }

      return await handler(event, context, resource);
    } catch (error) {
      console.error("Permission check error:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Internal server error" }),
      };
    }
  };
};

module.exports.checkDocumentpermission = (action) => {
  return (handler) => {
    return async (event, context, resource) => {
      try {
        const docKey = resource.SK.startsWith("DOCUMENT#")
          ? resource.SK
          : resource.PK.startsWith("DOCUMENT#")
          ? resource.PK
          : null;

        if (!docKey) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid document structure" }),
          };
        }

        const [type, id] = docKey.split("#");

        const resource_instance = `Document:${id}`;

        const resourcePermission = {
          user: event.requestContext.authorizer.email,
          resource_instance: resource_instance,
          permission: action,
        };
        console.log("resourcePermission:", resourcePermission);
        console.log("action:", action);
        const permitted = await getResourcePermissions(resourcePermission);
        console.log("Permission:", permitted);
        if (!permitted) {
          return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Access denied" }),
          };
        }
        return await handler(event, context, resource);
      } catch (error) {
        console.error("Permission check error:", error);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Internal server error" }),
        };
      }
    };
  };
};

async function getResourceById(resourceId) {
  const docParams = {
    TableName: process.env.FOLDER_DOCUMENTS_TABLE,
    Key: {
      PK: `DOCUMENT#${resourceId}`,
      SK: "METADATA",
    },
  };

  const docResult = await dynamoDB.get(docParams).promise();

  if (docResult.Item) {
    return docResult.Item;
  }

  const folderParams = {
    TableName: process.env.FOLDER_DOCUMENTS_TABLE,
    IndexName: "DocumentIndex",
    KeyConditionExpression: "SK = :sk",
    ExpressionAttributeValues: {
      ":sk": `DOCUMENT#${resourceId}`,
    },
  };

  const folderResult = await dynamoDB.query(folderParams).promise();

  if (folderResult.Items && folderResult.Items.length > 0) {
    return folderResult.Items[0];
  }

  const folderCheckParams = {
    TableName: process.env.FOLDER_DOCUMENTS_TABLE,
    Key: {
      PK: `FOLDER#${resourceId}`,
      SK: "FOLDER",
    },
  };

  const folderCheckResult = await dynamoDB.get(folderCheckParams).promise();

  if (folderCheckResult.Item) {
    return folderCheckResult.Item;
  }

  return null;
}
