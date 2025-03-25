const permit = require("../../init_permit");

async function syncUserWithPermit(user) {
  await permit.api.syncUser(user);

  return;
}

async function assignResourceInstanceRoleToUser(
  useremail,
  role,
  resource_instance
) {
  try {
    const assignedRole = await permit.api.roleAssignments.assign({
      user: useremail,
      role: role,
      resource_instance: resource_instance,
      tenant: "default",
    });

    return assignedRole;
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log("An unknown error occurred");
    }

    return null;
  }
}
module.exports = {
  assignResourceInstanceRoleToUser,
  syncUserWithPermit,
};
