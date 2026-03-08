import { z } from "zod";
import { TRACE_EVENT_TYPES, TRACE_SCHEMA_VERSION } from "./trace.types";

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const documentRefSchema = z.object({
  uri: z.string().min(1),
  contentHash: z.string().min(16),
  mediaType: z.string().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"])
});

export const producerSchema = z.object({
  producerId: z.string().min(3),
  legalName: z.string().min(2),
  countryCode: z.string().length(2),
  region: z.string().optional(),
  organizationWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export const batchSchema = z.object({
  batchId: z.string().min(8),
  producerId: z.string().min(3),
  productType: z.string().min(2),
  varietalOrSubtype: z.string().min(2),
  vineyardOrFarmLocation: z.string().min(2),
  harvestDate: z.string().date(),
  schemaVersion: z.string().default(TRACE_SCHEMA_VERSION)
});

export const issuerSchema = z.object({
  issuerId: z.string().min(3),
  organizationName: z.string().min(2),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  roles: z.array(z.string().min(2)).min(1),
  trusted: z.boolean().default(true)
});

export const traceEventSchema = z.object({
  schemaVersion: z.string().default(TRACE_SCHEMA_VERSION),
  eventId: z.string().min(8),
  batchId: z.string().min(8),
  eventType: z.enum(TRACE_EVENT_TYPES),
  issuerId: z.string().min(3),
  timestamp: isoDateTimeSchema,
  payload: z.record(z.string(), z.unknown()),
  payoutReference: z.string().min(4).optional(),
  documentRefs: z.array(documentRefSchema).default([]),
  prevEventHash: z.string().min(16).optional(),
  signature: z.string().min(32)
});

export const verificationResultSchema = z.object({
  batchId: z.string().min(8),
  verifiedAt: isoDateTimeSchema,
  completeLifecycle: z.boolean(),
  trustedIssuersOnly: z.boolean(),
  signaturesValid: z.boolean(),
  hashesConsistent: z.boolean(),
  chainAnchoringStatus: z.enum(["PENDING", "PARTIAL", "COMPLETE"]),
  notes: z.array(z.string())
});

export type ProducerInput = z.infer<typeof producerSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
export type IssuerInput = z.infer<typeof issuerSchema>;
export type TraceEventInput = z.infer<typeof traceEventSchema>;
export type VerificationResultInput = z.infer<typeof verificationResultSchema>;
