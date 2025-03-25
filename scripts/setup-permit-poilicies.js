require("dotenv").config();
const { Permit } = require("permitio");

const permit = new Permit({
  token: process.env.PERMIT_SDK_TOKEN,
});

const resourceConfig = {
  Document: {
    key: "Document",
    name: "Document",
    description: "A document in the system",
    actions: {
      create: {},
      read: {},
      delete: {},
    },
    roles: {
      owner: {
        name: "owner",
        description: "Owner of the document",
        permissions: ["create", "read", "delete"],
      },
      editor: {
        name: "editor",
        description: "Editor for the document",
        permissions: ["read", "delete"],
      },
    },
    attributes: {
      department: {
        type: "string",
        description: "Department that owns the document",
      },
    },
  },
  Folder: {
    key: "Folder",
    name: "Folder",
    description: "A Folder containing documents",
    actions: {
      create: {},
      read: {},
      delete: {},
    },
    roles: {
      admin: {
        name: "admin",
        description: "admin of the folder",
        permissions: ["create", "read", "delete"],
      },
      editor: {
        name: "editor",
        description: "editor for the folder",
        permissions: ["read", "delete"],
      },
    },
  },
};

async function createResource(resourceKey) {
  const resource = resourceConfig[resourceKey];
  let existingResource;

  try {
    existingResource = await permit.api.resources.get(resourceKey);
  } catch (err) {
    console.log(
      `Resource ${resource.key} does not exist. Proceeding to create it.`
    );
  }

  if (!existingResource) {
    await permit.api.createResource({
      key: resource.key,
      name: resource.name,
      description: resource.description,
      actions: resource.actions,
      roles: resource.roles,
      attributes: resource.attributes,
    });
    console.log(`Resource ${resource.key} created successfully.`);
  } else {
    await permit.api.updateResource(resource.key, {
      name: resource.name,
      description: resource.description,
      actions: resource.actions,
      roles: resource.roles,
      attributes: resource.attributes,
    });
    console.log(`Resource ${resource.key} updated successfully.`);
  }
}

const createResourceRelations = async () => {
  console.log("Create Document -> Folder(parent) Relation");
  try {
    await permit.api.resourceRelations.get("Document", "parent");
  } catch (error) {
    await permit.api.resourceRelations.create("Document", {
      key: "parent",
      name: "Parent",
      subject_resource: "Folder",
    });
  }
};

const createRoleDerivations = async () => {
  console.log("Create Folder:admin derives from  Document:owner ");

  await permit.api.resourceRoles.update("Document", "owner", {
    granted_to: {
      users_with_role: [
        {
          linked_by_relation: "parent",
          on_resource: "Folder",
          role: "admin",
        },
      ],
    },
  });
  console.log("Create Folder:editor derives from  Document:editor ");

  await permit.api.resourceRoles.update("Document", "editor", {
    granted_to: {
      users_with_role: [
        {
          linked_by_relation: "parent",
          on_resource: "Folder",
          role: "editor",
        },
      ],
    },
  });
};

const setupAbacPolicies = async () => {
  try {
    console.log("Setting up ABAC policies...");

    await permit.api.conditionSets.create({
      name: "Q/A department rules",
      key: "QA_department_rules",
      description: "Check if user is in the Quality assurance",
      type: "userset",
      conditions: {
        allOf: [
          {
            allOf: [
              { "user.department": { equals: "QA" } },
              { "user.classification": { equals: "Admin" } },
            ],
          },
        ],
      },
    });

    await permit.api.conditionSets.create({
      name: "Engineering Department Rules",
      key: "engineering_department_rules",
      description: "Check if user is in the engineering department",
      type: "userset",
      conditions: {
        allOf: [
          {
            allOf: [
              { "user.department": { equals: "Engineering" } },
              { "user.classification": { equals: "Admin" } },
            ],
          },
        ],
      },
    });

    await permit.api.conditionSets.create({
      key: "departmental_heirarchy",
      name: "Departmental Heirarchy",
      type: "resourceset",
      resource_id: "Document",
      conditions: {
        allOf: [
          {
            allOf: [
              {
                "resource.department": {
                  equals: { ref: "user.department" },
                },
              },
            ],
          },
        ],
      },
    });
    console.log("ABAC policies set up successfully.");
  } catch (error) {
    console.error("ABAC policies set up failed.");
  }
};

const createAbacPolicyRules = async () => {
  try {
    console.log("Creating ABAC policy rules");

    await permit.api.conditionSetRules.create({
      user_set: "engineering_department_rules",
      resource_set: "departmental_heirarchy",
      permission: "Document:create",
    });
    await permit.api.conditionSetRules.create({
      user_set: "engineering_department_rules",
      resource_set: "departmental_heirarchy",
      permission: "Document:read",
    });

    await permit.api.conditionSetRules.create({
      user_set: "QA_department_rules",
      resource_set: "departmental_heirarchy",
      permission: "Document:create",
    });
    await permit.api.conditionSetRules.create({
      user_set: "QA_department_rules",
      resource_set: "departmental_heirarchy",
      permission: "Document:read",
    });

    console.log("ABAC policy rules set up successfully.");
  } catch (error) {
    console.log("ABAC policies rules set up failed.");
  }
};

async function setupPermitPolicies() {
  const resourceKeys = ["Folder", "Document"];
  for (const resourceKey of resourceKeys) {
    await createResource(resourceKey);
  }
  await createResourceRelations();
  await createRoleDerivations();
  await setupAbacPolicies();
  await createAbacPolicyRules();
}

(async () => {
  console.log("Starting Permit policy setup...");
  try {
    await setupPermitPolicies();
  } catch (error) {
    console.error("Fatal error during policy setup:", error);
  }
})();
