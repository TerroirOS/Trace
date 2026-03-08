const API_URL = process.env.TRACE_API_URL ?? "http://localhost:4000";

export interface BatchSummary {
  batchId: string;
  producerId: string;
  productType: string;
  varietalOrSubtype: string;
  vineyardOrFarmLocation: string;
  harvestDate: string;
  schemaVersion: string;
}

export interface BatchEventView {
  eventId: string;
  eventType: string;
  issuerId: string;
  timestamp: string;
}

export interface VerificationView {
  batchId: string;
  completeLifecycle: boolean;
  trustedIssuersOnly: boolean;
  signaturesValid: boolean;
  hashesConsistent: boolean;
  chainAnchoringStatus: "PENDING" | "PARTIAL" | "COMPLETE";
  notes: string[];
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getBatches(): Promise<BatchSummary[]> {
  return safeFetch("/batches", []);
}

export function getBatchEvents(batchId: string): Promise<BatchEventView[]> {
  return safeFetch(`/events/batch/${batchId}`, []);
}

export function getVerification(batchId: string): Promise<VerificationView | null> {
  return safeFetch(`/verification/${batchId}`, null);
}
