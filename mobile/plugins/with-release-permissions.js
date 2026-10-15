const { withInfoPlist } = require('expo/config-plugins');

module.exports = config => withInfoPlist(config, mod => {
  // Development discovery is not a feature of the store app.
  delete mod.modResults.NSLocalNetworkUsageDescription;
  delete mod.modResults.NSBonjourServices;
  return mod;
});
