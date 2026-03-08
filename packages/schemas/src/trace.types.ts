export const TRACE_SCHEMA_VERSION = "1.0.0";

export const TRACE_EVENT_TYPES = [
  "BATCH_CREATED",
  "HARVEST_RECORDED",
  "PROCESSING_RECORDED",
  "BOTTLING_RECORDED",
  "SHIPMENT_RECORDED",
  "THIRD_PARTY_VERIFIED"
] as const;

export type TraceEventType = (typeof TRACE_EVENT_TYPES)[number];

export type DocumentVisibility = "PUBLIC" | "PRIVATE";

export interface DocumentRef {
  uri: string;
  contentHash: string;
  mediaType?: string;
  visibility: DocumentVisibility;
}

export interface Producer {
  producerId: string;
  legalName: string;
  countryCode: string;
  region?: string;
  organizationWallet: string;
}

export interface Batch {
  batchId: string;
  producerId: string;
  productType: string;
  varietalOrSubtype: string;
  vineyardOrFarmLocation: string;
  harvestDate: string;
  schemaVersion: string;
}

export interface Issuer {
  issuerId: string;
  organizationName: string;
  walletAddress: string;
  roles: string[];
  trusted: boolean;
}

export interface BatchEvent<TPayload = Record<string, unknown>> {
  schemaVersion: string;
  eventId: string;
  batchId: string;
  eventType: TraceEventType;
  issuerId: string;
  timestamp: string;
  payload: TPayload;
  payoutReference?: string;
  documentRefs: DocumentRef[];
  prevEventHash?: string;
  signature: string;
}

export interface VerificationResult {
  batchId: string;
  verifiedAt: string;
  completeLifecycle: boolean;
  trustedIssuersOnly: boolean;
  signaturesValid: boolean;
  hashesConsistent: boolean;
  chainAnchoringStatus: "PENDING" | "PARTIAL" | "COMPLETE";
  notes: string[];
}
