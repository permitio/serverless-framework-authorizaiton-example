const { Permit } = require("permitio");

module.exports = new Permit({
  pdp: process.env.PERMIT_PDP_URL,
  token: process.env.PERMIT_SDK_TOKEN,
});
