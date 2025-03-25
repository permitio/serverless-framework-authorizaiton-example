const { getdocument, checkDocumentpermission } = require("../auth/middleware");
const {
  PermissionType,
} = require("../helper_functions/get_resource_permissions");

const handler = async (event, context, document) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Access Granted!",
      document,
    }),
  };
};

module.exports.getDocument = getdocument(
  checkDocumentpermission(PermissionType.READ)(handler)
);
