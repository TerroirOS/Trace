import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Trace registries", () => {
  it("anchors a batch once and stores sender/timestamp", async () => {
    const factory = await ethers.getContractFactory("BatchRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();

    const batchId = ethers.id("batch-001");
    const rootHash = ethers.id("root");
    const metadataHash = ethers.id("metadata");

    await expect(registry.anchorBatch(batchId, rootHash, metadataHash))
      .to.emit(registry, "BatchAnchored")
      .withArgs(
        batchId,
        rootHash,
        metadataHash,
        (await ethers.getSigners())[0].address,
        anyValue
      );

    const batch = await registry.getBatch(batchId);
    expect(batch.rootHash).to.equal(rootHash);
    expect(batch.metadataHash).to.equal(metadataHash);
    expect(batch.exists).to.equal(true);
  });

  it("records attestation and prevents duplicate event IDs", async () => {
    const factory = await ethers.getContractFactory("AttestationRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();

    const eventId = ethers.id("event-001");
    const batchId = ethers.id("batch-001");
    const attestationHash = ethers.id("attestation-001");

    await expect(registry.recordAttestation(eventId, batchId, attestationHash))
      .to.emit(registry, "AttestationRecorded")
      .withArgs(
        eventId,
        batchId,
        attestationHash,
        (await ethers.getSigners())[0].address,
        anyValue
      );

    await expect(
      registry.recordAttestation(eventId, batchId, ethers.id("attestation-002"))
    ).to.be.revertedWithCustomError(registry, "DuplicateEvent");
  });
});

