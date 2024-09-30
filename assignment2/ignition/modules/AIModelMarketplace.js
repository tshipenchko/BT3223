const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AIModelMarketplace", (m) => {
  const AIModelMarketplace = m.contract("AIModelMarketplace");
  return { AIModelMarketplace };
});