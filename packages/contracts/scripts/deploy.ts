import { ethers } from "hardhat";

async function main(): Promise<void> {
  const batchRegistryFactory = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await batchRegistryFactory.deploy();
  await batchRegistry.waitForDeployment();

  const attestationRegistryFactory =
    await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await attestationRegistryFactory.deploy();
  await attestationRegistry.waitForDeployment();

  // eslint-disable-next-line no-console
  console.log("BatchRegistry:", await batchRegistry.getAddress());
  // eslint-disable-next-line no-console
  console.log("AttestationRegistry:", await attestationRegistry.getAddress());
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
