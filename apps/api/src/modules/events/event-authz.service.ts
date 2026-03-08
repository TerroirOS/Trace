import { ForbiddenException, Injectable } from "@nestjs/common";
import type { BatchEvent, TraceEventType } from "@terroiros/schemas";
import { keccak256, toUtf8Bytes, verifyTypedData } from "ethers";
import { IssuersService } from "../issuers/issuers.service";

const allowedRolesByEventType: Record<TraceEventType, string[]> = {
  BATCH_CREATED: ["WINERY_OPERATOR", "ASSOCIATION"],
  HARVEST_RECORDED: ["WINERY_OPERATOR"],
  PROCESSING_RECORDED: ["WINERY_OPERATOR"],
  BOTTLING_RECORDED: ["WINERY_OPERATOR"],
  SHIPMENT_RECORDED: ["LOGISTICS_PARTNER", "WINERY_OPERATOR"],
  THIRD_PARTY_VERIFIED: ["CERTIFIER", "ASSOCIATION"]
};

@Injectable()
export class EventAuthzService {
  constructor(private readonly issuersService: IssuersService) {}

  verifySignature(event: BatchEvent): string {
    const issuer = this.issuersService.getById(event.issuerId);
    const domain = {
      name: "TerroirOS Trace",
      version: event.schemaVersion,
      chainId: 80002
    };
    const types = {
      BatchEvent: [
        { name: "eventId", type: "string" },
        { name: "batchId", type: "string" },
        { name: "eventType", type: "string" },
        { name: "issuerId", type: "string" },
        { name: "timestamp", type: "string" },
        { name: "payloadHash", type: "bytes32" },
        { name: "prevEventHash", type: "bytes32" }
      ]
    };
    const payloadHash = keccak256(toUtf8Bytes(JSON.stringify(event.payload)));
    const message = {
      eventId: event.eventId,
      batchId: event.batchId,
      eventType: event.eventType,
      issuerId: event.issuerId,
      timestamp: event.timestamp,
      payloadHash,
      prevEventHash: event.prevEventHash ?? `0x${"0".repeat(64)}`
    };
    const recovered = verifyTypedData(domain, types, message, event.signature);
    if (recovered.toLowerCase() !== issuer.walletAddress.toLowerCase()) {
      throw new ForbiddenException("EIP-712 signature does not match issuer wallet.");
    }
    return recovered.toLowerCase();
  }

  authorizeEventType(event: BatchEvent): void {
    const issuer = this.issuersService.getById(event.issuerId);
    const allowedRoles = allowedRolesByEventType[event.eventType];
    const hasAllowedRole = issuer.roles.some((role) => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      throw new ForbiddenException(
        `Issuer ${issuer.issuerId} is not authorized for ${event.eventType}.`
      );
    }
  }
}
