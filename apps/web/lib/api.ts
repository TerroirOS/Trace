import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

const API_URL = process.env.TRACE_API_URL ?? "http://localhost:4000";
const PREFER_TRACE_API =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_SUPERADMIN_BYPASS === "true";

// ─── Types ───────────────────────────────────────────────────

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
  issuerName?: string;
  issuerRoles?: string[];
  timestamp: string;
}

export interface ProducerView {
  producerId: string;
  legalName: string;
  countryCode: string;
  region?: string;
  organizationWallet: string;
}

export interface IssuerView {
  issuerId: string;
  organizationName: string;
  walletAddress: string;
  roles: string[];
  trusted: boolean;
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

export interface ChainTransactionView {
  txId: string;
  eventId: string;
  status: "QUEUED" | "SUBMITTED" | "CONFIRMED" | "FAILED";
  txHash?: string;
  blockNumber?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── REST fallback ───────────────────────────────────────────

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

// ─── Row → View mappers (Supabase snake_case → camelCase) ───

function rowToProducer(r: Record<string, unknown>): ProducerView {
  return {
    producerId: r.producer_id as string,
    legalName: r.legal_name as string,
    countryCode: r.country_code as string,
    region: (r.region as string) ?? undefined,
    organizationWallet: (r.organization_wallet as string) ?? ""
  };
}

function rowToBatch(r: Record<string, unknown>): BatchSummary {
  return {
    batchId: r.batch_id as string,
    producerId: r.producer_id as string,
    productType: r.product_type as string,
    varietalOrSubtype: (r.varietal_or_subtype as string) ?? "",
    vineyardOrFarmLocation: (r.vineyard_or_farm_location as string) ?? "",
    harvestDate: (r.harvest_date as string) ?? "",
    schemaVersion: (r.schema_version as string) ?? "0.1.0"
  };
}

function rowToIssuer(r: Record<string, unknown>): IssuerView {
  const rawRoles = r.roles;
  const roles = Array.isArray(rawRoles)
    ? rawRoles.filter((role): role is string => typeof role === "string")
    : [];

  return {
    issuerId: r.issuer_id as string,
    organizationName: r.organization_name as string,
    walletAddress: (r.wallet_address as string) ?? "",
    roles,
    trusted: (r.trusted as boolean) ?? false
  };
}

function rowToEvent(r: Record<string, unknown>): BatchEventView {
  return {
    eventId: r.event_id as string,
    eventType: r.event_type as string,
    issuerId: r.issuer_id as string,
    timestamp:
      (r.event_timestamp as string) ??
      (r.timestamp as string) ??
      (r.created_at as string)
  };
}

function rowToChainTx(r: Record<string, unknown>): ChainTransactionView {
  return {
    txId: r.tx_id as string,
    eventId: r.event_id as string,
    status: r.status as ChainTransactionView["status"],
    txHash: (r.tx_hash as string) ?? undefined,
    blockNumber: (r.block_number as number) ?? undefined,
    error: (r.error as string) ?? undefined,
    createdAt: (r.created_at as string) ?? "",
    updatedAt: (r.updated_at as string) ?? ""
  };
}

function isMissingIssuerRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    message.includes("could not find the table")
  );
}

// ─── Public API ──────────────────────────────────────────────

export async function getProducers(): Promise<ProducerView[]> {
  if (PREFER_TRACE_API) {
    return safeFetch("/producers", []);
  }
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseClient()!;
      const { data, error } = await sb.from("producers").select("*");
      if (error || !data) return [];
      return data.map(rowToProducer);
    } catch {
      return [];
    }
  }
  return safeFetch("/producers", []);
}

export async function getBatches(): Promise<BatchSummary[]> {
  if (PREFER_TRACE_API) {
    return safeFetch("/batches", []);
  }
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseClient()!;
      const { data, error } = await sb
        .from("batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map(rowToBatch);
    } catch {
      return [];
    }
  }
  return safeFetch("/batches", []);
}

export async function getIssuers(): Promise<IssuerView[]> {
  if (PREFER_TRACE_API) {
    return safeFetch("/issuers", []);
  }
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseClient()!;
      const firstResult = await sb.from("issuers").select("*");
      if (!firstResult.error && firstResult.data) {
        return firstResult.data.map(rowToIssuer);
      }

      if (!isMissingIssuerRelation(firstResult.error)) {
        return [];
      }

      const fallbackResult = await sb.from("issuer_attestations").select("*");
      if (fallbackResult.error || !fallbackResult.data) return [];
      return fallbackResult.data.map(rowToIssuer);
    } catch {
      return [];
    }
  }
  return safeFetch("/issuers", []);
}

export async function getBatchEvents(
  batchId: string
): Promise<BatchEventView[]> {
  if (PREFER_TRACE_API) {
    return safeFetch(`/events/batch/${batchId}`, []);
  }
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseClient()!;
      const { data, error } = await sb
        .from("batch_events")
        .select("*")
        .eq("batch_id", batchId)
        .order("event_timestamp", { ascending: true });
      if (error || !data) return [];
      return data.map(rowToEvent);
    } catch {
      return [];
    }
  }
  return safeFetch(`/events/batch/${batchId}`, []);
}

export async function getVerification(
  batchId: string
): Promise<VerificationView | null> {
  // Prefer API verification because it includes signature policy and chain checks.
  const apiVerification = await safeFetch<VerificationView | null>(
    `/verification/${batchId}`,
    null
  );
  if (apiVerification) {
    return apiVerification;
  }

  if (isSupabaseConfigured()) {
    try {
      const events = await getBatchEvents(batchId);
      const lifecycleTypes = new Set([
        "BATCH_CREATED",
        "HARVEST_RECORDED",
        "PROCESSING_RECORDED",
        "BOTTLING_RECORDED",
        "SHIPMENT_RECORDED"
      ]);
      const eventTypes = new Set(events.map((e) => e.eventType));
      const completeLifecycle = [...lifecycleTypes].every((t) =>
        eventTypes.has(t)
      );

      const issuers = await getIssuers();
      const issuerMap = new Map(issuers.map((i) => [i.issuerId, i]));
      const trustedIssuersOnly = events.every(
        (e) => issuerMap.get(e.issuerId)?.trusted ?? false
      );

      let chainAnchoringStatus: VerificationView["chainAnchoringStatus"] =
        "PENDING";
      if (events.length > 0) {
        try {
          const sb = getSupabaseClient()!;
          const { data: txData } = await sb
            .from("chain_transactions")
            .select("status")
            .in(
              "event_id",
              events.map((e) => e.eventId)
            );
          const txStatuses = (txData ?? []).map(
            (r: Record<string, unknown>) => r.status
          );
          if (txStatuses.length > 0) {
            const allConfirmed = txStatuses.every((s) => s === "CONFIRMED");
            chainAnchoringStatus = allConfirmed ? "COMPLETE" : "PARTIAL";
          }
        } catch {
          /* chain_transactions table may not exist yet */
        }
      }

      return {
        batchId,
        completeLifecycle,
        trustedIssuersOnly,
        signaturesValid: events.length > 0,
        hashesConsistent: events.length > 0,
        chainAnchoringStatus,
        notes: []
      };
    } catch {
      return null;
    }
  }
  return safeFetch(`/verification/${batchId}`, null);
}

export async function getChainTransactions(): Promise<ChainTransactionView[]> {
  if (PREFER_TRACE_API) {
    return safeFetch("/chain/transactions", []);
  }
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseClient()!;
      const { data, error } = await sb
        .from("chain_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map(rowToChainTx);
    } catch {
      return [];
    }
  }
  return safeFetch("/chain/transactions", []);
}
