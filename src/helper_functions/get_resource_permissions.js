const permit = require("../../init_permit");

const PermissionType = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
};

/**
 * @typedef {Object} ResourcePermission
 * @property {string} user
 * @property {string} resource_instance
 * @property {string} permission
 */

/**
 * Checks the specified permissions for a user on a resource instance.
 *
 * @param {ResourcePermission} resourcePermission - The resource permission details.
 * @returns {Promise<boolean>} - A map of permission types to their granted status.
 */
async function getResourcePermissions(resourcePermission) {
  try {
    const { user, resource_instance, permission } = resourcePermission;

    const permitted = await permit.check(user, permission, resource_instance);

    return permitted;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
    return false;
  }
}

module.exports = {
  getResourcePermissions,
  PermissionType,
};
