const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  try {
    const token = event.authorizationToken?.split(" ")[1];

    if (!token) {
      return generatePolicy(null, "Deny", event.methodArn);
    }

    const decoded = jwt.decode(token);

    if (!decoded || !decoded.sub) {
      return generatePolicy(null, "Deny", event.methodArn);
    }

    const email = decoded.sub;

    const verified = jwt.verify(token, email);

    const context = {
      userId: verified.sub,
      email: verified.sub,
      department: verified.department,
      classification: verified.classification,
    };

    return generatePolicy(verified.sub, "Allow", event.methodArn, context);
  } catch (error) {
    console.error("Authorization error:", error);
    return generatePolicy(null, "Deny", event.methodArn);
  }
};

function generatePolicy(principalId, effect, resource, context = {}) {
  const authResponse = { principalId };

  if (effect && resource) {
    authResponse.policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    };
  }

  authResponse.context = context;
  return authResponse;
}
