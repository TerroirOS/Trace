import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Contract,
  FallbackProvider,
  JsonRpcProvider,
  Wallet,
  keccak256,
  toUtf8Bytes
} from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";

interface AttestationContractRecord {
  eventId: string;
  batchId: string;
  attestationHash: string;
  issuer: string;
  timestamp: number;
}

interface ContractArtifacts {
  attestationAbi: readonly unknown[];
  batchAbi: readonly unknown[];
}

@Injectable()
export class ChainClient {
  private readonly logger = new Logger(ChainClient.name);
  private readonly provider: JsonRpcProvider | FallbackProvider | null;
  private readonly signer: Wallet | null;
  private readonly attestationRegistry: Contract | null;
  private readonly batchRegistry: Contract | null;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>("CHAIN_RPC_URL")?.trim();
    const fallbackUrl = this.configService
      .get<string>("CHAIN_RPC_FALLBACK_URL")
      ?.trim();
    const privateKey = this.configService
      .get<string>("DEPLOYER_PRIVATE_KEY")
      ?.trim();
    const attestationAddress = this.configService
      .get<string>("ATTESTATION_REGISTRY_ADDRESS")
      ?.trim();
    const batchAddress = this.configService
      .get<string>("BATCH_REGISTRY_ADDRESS")
      ?.trim();

    this.configured = Boolean(rpcUrl && privateKey && attestationAddress);
    if (!this.configured) {
      this.provider = null;
      this.signer = null;
      this.attestationRegistry = null;
      this.batchRegistry = null;
      return;
    }

    const provider = fallbackUrl
      ? new FallbackProvider([
          { provider: new JsonRpcProvider(rpcUrl), priority: 1, weight: 2 },
          { provider: new JsonRpcProvider(fallbackUrl), priority: 2, weight: 1 }
        ])
      : new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey as string, provider);
    const artifacts = this.loadContractArtifacts();
    const attestationRegistry = new Contract(
      attestationAddress as string,
      artifacts.attestationAbi as any,
      signer
    );
    const batchRegistry = batchAddress
      ? new Contract(batchAddress, artifacts.batchAbi as any, signer)
      : null;

    this.provider = provider;
    this.signer = signer;
    this.attestationRegistry = attestationRegistry;
    this.batchRegistry = batchRegistry;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  static eventIdToBytes32(eventId: string): string {
    return keccak256(toUtf8Bytes(eventId));
  }

  static batchIdToBytes32(batchId: string): string {
    return keccak256(toUtf8Bytes(batchId));
  }

  static hashToBytes32(hashHex: string): string {
    const normalized = hashHex.startsWith("0x") ? hashHex : `0x${hashHex}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
      throw new Error(`Invalid bytes32 hash: ${hashHex}`);
    }
    return normalized.toLowerCase();
  }

  async recordAttestation(input: {
    eventId: string;
    batchId: string;
    eventHash: string;
  }): Promise<{ txHash: string }> {
    if (!this.attestationRegistry) {
      throw new Error("Chain client is not configured.");
    }
    const tx = await this.attestationRegistry.recordAttestation(
      ChainClient.eventIdToBytes32(input.eventId),
      ChainClient.batchIdToBytes32(input.batchId),
      ChainClient.hashToBytes32(input.eventHash)
    );
    return { txHash: tx.hash as string };
  }

  async ensureBatchAnchor(input: {
    batchId: string;
    batchFingerprint: string;
  }): Promise<void> {
    if (!this.batchRegistry) {
      return;
    }
    const batchId = ChainClient.batchIdToBytes32(input.batchId);
    const fingerprint = ChainClient.hashToBytes32(input.batchFingerprint);
    try {
      await this.batchRegistry.getBatch(batchId);
      return;
    } catch {
      // Batch anchor does not exist yet; write it once.
    }
    const tx = await this.batchRegistry.anchorBatch(batchId, fingerprint, fingerprint);
    await tx.wait(1);
  }

  async getAttestationByEventId(eventId: string): Promise<AttestationContractRecord | null> {
    if (!this.attestationRegistry) {
      return null;
    }
    try {
      const record = await this.attestationRegistry.getAttestation(
        ChainClient.eventIdToBytes32(eventId)
      );
      return {
        eventId: String(record.eventId),
        batchId: String(record.batchId),
        attestationHash: String(record.attestationHash).toLowerCase(),
        issuer: String(record.issuer).toLowerCase(),
        timestamp: Number(record.timestamp)
      };
    } catch {
      return null;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<{
    blockNumber: number;
    status: number | null;
  } | null> {
    if (!this.provider) {
      return null;
    }
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return null;
    }
    return {
      blockNumber: Number(receipt.blockNumber),
      status: receipt.status ?? null
    };
  }

  private loadContractArtifacts(): ContractArtifacts {
    const attestationCandidates = [
      path.resolve(
        process.cwd(),
        "packages/contracts/artifacts/src/AttestationRegistry.sol/AttestationRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../packages/contracts/artifacts/src/AttestationRegistry.sol/AttestationRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../../packages/contracts/artifacts/src/AttestationRegistry.sol/AttestationRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "packages/contracts/artifacts/contracts/src/AttestationRegistry.sol/AttestationRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../packages/contracts/artifacts/contracts/src/AttestationRegistry.sol/AttestationRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../../packages/contracts/artifacts/contracts/src/AttestationRegistry.sol/AttestationRegistry.json"
      )
    ];
    const batchCandidates = [
      path.resolve(
        process.cwd(),
        "packages/contracts/artifacts/src/BatchRegistry.sol/BatchRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../packages/contracts/artifacts/src/BatchRegistry.sol/BatchRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../../packages/contracts/artifacts/src/BatchRegistry.sol/BatchRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "packages/contracts/artifacts/contracts/src/BatchRegistry.sol/BatchRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../packages/contracts/artifacts/contracts/src/BatchRegistry.sol/BatchRegistry.json"
      ),
      path.resolve(
        process.cwd(),
        "../../packages/contracts/artifacts/contracts/src/BatchRegistry.sol/BatchRegistry.json"
      )
    ];

    const attestationAbi = this.tryLoadAbi(attestationCandidates);
    const batchAbi = this.tryLoadAbi(batchCandidates);
    if (attestationAbi && batchAbi) {
      return { attestationAbi, batchAbi };
    }

    this.logger.warn("Contract artifacts not found. Falling back to minimal runtime ABI.");
    return {
      attestationAbi:
        attestationAbi ?? [
          "function recordAttestation(bytes32 eventId, bytes32 batchId, bytes32 attestationHash)",
          "function getAttestation(bytes32 eventId) view returns (tuple(bytes32 eventId, bytes32 batchId, bytes32 attestationHash, address issuer, uint256 timestamp))"
        ],
      batchAbi:
        batchAbi ?? [
          "function anchorBatch(bytes32 batchId, bytes32 rootHash, bytes32 metadataHash)",
          "function getBatch(bytes32 batchId) view returns (tuple(bytes32 rootHash, bytes32 metadataHash, address issuer, uint256 createdAt, bool exists))"
        ]
    };
  }

  private tryLoadAbi(candidates: string[]): readonly unknown[] | null {
    for (const candidatePath of candidates) {
      if (!fs.existsSync(candidatePath)) {
        continue;
      }
      const payload = fs.readFileSync(candidatePath, "utf-8");
      const parsed = JSON.parse(payload) as { abi: readonly unknown[] };
      if (Array.isArray(parsed.abi) && parsed.abi.length > 0) {
        return parsed.abi;
      }
    }
    return null;
  }
}
