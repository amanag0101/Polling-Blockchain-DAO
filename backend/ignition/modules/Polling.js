const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

const organisationName = "Green Group LLC";
const ownerName = "John Doe";
const taskApprovalPercentage = 66;
const minimumStakingAmount = ethers.parseEther("5");
const vestingPeriodInDays = 365;

module.exports = buildModule("PollingModule", (m) => {
  const polling = m.contract("Polling", [
    organisationName,
    ownerName,
    taskApprovalPercentage,
    minimumStakingAmount,
    vestingPeriodInDays,
  ]);

  return { polling };
});
