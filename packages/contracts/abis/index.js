"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ATTESTATION_ARTIFACT_PATHS = [
  path.join(
    __dirname,
    "..",
    "artifacts",
    "src",
    "AttestationRegistry.sol",
    "AttestationRegistry.json"
  ),
  path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "src",
    "AttestationRegistry.sol",
    "AttestationRegistry.json"
  )
];

const BATCH_ARTIFACT_PATHS = [
  path.join(
    __dirname,
    "..",
    "artifacts",
    "src",
    "BatchRegistry.sol",
    "BatchRegistry.json"
  ),
  path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "src",
    "BatchRegistry.sol",
    "BatchRegistry.json"
  )
];

const FALLBACK_ATTESTATION_ABI = [
  "function recordAttestation(bytes32 eventId, bytes32 batchId, bytes32 attestationHash)",
  "function getAttestation(bytes32 eventId) view returns (tuple(bytes32 eventId, bytes32 batchId, bytes32 attestationHash, address issuer, uint256 timestamp))"
];

const FALLBACK_BATCH_ABI = [
  "function anchorBatch(bytes32 batchId, bytes32 rootHash, bytes32 metadataHash)",
  "function getBatch(bytes32 batchId) view returns (tuple(bytes32 rootHash, bytes32 metadataHash, address issuer, uint256 createdAt, bool exists))"
];

function tryLoadAbi(candidatePaths) {
  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) {
      continue;
    }

    const payload = fs.readFileSync(candidatePath, "utf8");
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed.abi) && parsed.abi.length > 0) {
      return parsed.abi;
    }
  }

  return null;
}

function getContractAbis() {
  const attestationAbi = tryLoadAbi(ATTESTATION_ARTIFACT_PATHS);
  const batchAbi = tryLoadAbi(BATCH_ARTIFACT_PATHS);

  return {
    attestationAbi: attestationAbi ?? FALLBACK_ATTESTATION_ABI,
    batchAbi: batchAbi ?? FALLBACK_BATCH_ABI
  };
}

module.exports = {
  getContractAbis
};
