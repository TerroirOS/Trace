"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { isSuperadminUser } from "./auth";
import { getServerSupabase, getServiceRoleSupabase } from "./supabase-server";
import {
  DEV_SUPERADMIN_BYPASS_COOKIE,
  expectedDevSuperadminBypassToken,
  isDevSuperadminBypassEnabled,
  isValidDevSuperadminBypassCookie
} from "./dev-bypass";

const TRACE_API_URL = process.env.TRACE_API_URL ?? "http://localhost:4000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ─── ID generation ───────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hash helpers ────────────────────────────────────────────

function sha256hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function computeEventHash(fields: {
  eventId: string;
  batchId: string;
  issuerId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}): string {
  const canonical = JSON.stringify(fields, Object.keys(fields).sort());
  return sha256hex(canonical);
}

function normalizeNextPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured;
  }

  const requestHeaders = headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "127.0.0.1:3000";

  return `${protocol}://${host}`;
}

function isTableMissing(error: PostgrestError | null): boolean {
  if (!error) {
    return false;
  }
  return (
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.message.toLowerCase().includes("could not find the table")
  );
}

function isRlsError(error: PostgrestError | null): boolean {
  if (!error) {
    return false;
  }
  return (
    error.code === "42501" ||
    error.message.toLowerCase().includes("row-level security")
  );
}

type WriteContext = {
  client: SupabaseClient;
  hasSession: boolean;
  isSuperadmin: boolean;
  usingServiceRole: boolean;
};

async function getWriteContext(): Promise<WriteContext> {
  const sessionClient = getServerSupabase();

  if (isDevSuperadminBypassEnabled()) {
    const bypassCookieValue = cookies().get(DEV_SUPERADMIN_BYPASS_COOKIE)?.value;
    if (isValidDevSuperadminBypassCookie(bypassCookieValue)) {
      const serviceRoleClient = getServiceRoleSupabase();
      return {
        client: serviceRoleClient ?? sessionClient,
        hasSession: true,
        isSuperadmin: true,
        usingServiceRole: Boolean(serviceRoleClient)
      };
    }
  }

  const {
    data: { user }
  } = await sessionClient.auth.getUser();

  if (!user) {
    return {
      client: sessionClient,
      hasSession: false,
      isSuperadmin: false,
      usingServiceRole: false
    };
  }

  const superadmin = isSuperadminUser(user);
  if (superadmin) {
    const serviceRoleClient = getServiceRoleSupabase();
    if (serviceRoleClient) {
      return {
        client: serviceRoleClient,
        hasSession: true,
        isSuperadmin: true,
        usingServiceRole: true
      };
    }
  }

  return {
    client: sessionClient,
    hasSession: true,
    isSuperadmin: superadmin,
    usingServiceRole: false
  };
}

function superadminGuardError(context: WriteContext): string | null {
  if (!context.hasSession) {
    return "Please sign in via magic link before performing this action.";
  }
  if (!context.isSuperadmin) {
    return "Your account is authenticated but does not have superadmin access.";
  }
  return null;
}

function writeErrorMessage(error: PostgrestError, context: WriteContext): string {
  if (isRlsError(error) && !context.usingServiceRole) {
    return `${error.message} Configure SUPABASE_SERVICE_ROLE_KEY for superadmin write access.`;
  }
  return error.message;
}

function isDevBypassCookieActive(): boolean {
  if (!isDevSuperadminBypassEnabled()) {
    return false;
  }
  return isValidDevSuperadminBypassCookie(
    cookies().get(DEV_SUPERADMIN_BYPASS_COOKIE)?.value
  );
}

function shouldUseDevApiFallback(
  error: PostgrestError,
  context: WriteContext
): boolean {
  return isRlsError(error) && !context.usingServiceRole && isDevBypassCookieActive();
}

function normalizeWalletForApi(value: string): string {
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? value : ZERO_ADDRESS;
}

async function postToTraceApi(path: string, payload: Record<string, unknown>) {
  try {
    const response = await fetch(`${TRACE_API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { ok: true as const };
    }

    const message = await response.text();
    return {
      ok: false as const,
      error: message || `Trace API request failed (${response.status}).`
    };
  } catch (error) {
    return {
      ok: false as const,
      error: `Trace API fallback failed: ${String(error)}`
    };
  }
}

// ─── Create Producer ─────────────────────────────────────────

export async function createProducer(formData: FormData) {
  const legalName = String(formData.get("legalName") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "GE").trim().toUpperCase();
  const region = String(formData.get("region") ?? "").trim();
  const organizationWallet = String(formData.get("organizationWallet") ?? "").trim();

  if (!legalName || !countryCode) {
    return { error: "Legal name and country code are required." };
  }

  const context = await getWriteContext();
  const authError = superadminGuardError(context);
  if (authError) {
    return { error: authError };
  }

  const producerId = uid("prod");
  const { error } = await context.client.from("producers").insert({
    producer_id: producerId,
    legal_name: legalName,
    country_code: countryCode.slice(0, 2),
    region: region || null,
    organization_wallet: organizationWallet || ""
  });

  if (error) {
    if (shouldUseDevApiFallback(error, context)) {
      const apiResult = await postToTraceApi("/producers", {
        producerId,
        legalName,
        countryCode: countryCode.slice(0, 2),
        region: region || undefined,
        organizationWallet: normalizeWalletForApi(organizationWallet)
      });
      if (!apiResult.ok) {
        return { error: apiResult.error };
      }
    } else {
      return { error: writeErrorMessage(error, context) };
    }
  }

  revalidatePath("/portal/producer");
  revalidatePath("/dashboard");
  redirect("/portal/producer");
}

// ─── Create Batch ────────────────────────────────────────────

export async function createBatch(formData: FormData) {
  const producerId = String(formData.get("producerId") ?? "").trim();
  const productType = String(formData.get("productType") ?? "").trim();
  const varietalOrSubtype = String(formData.get("varietalOrSubtype") ?? "").trim();
  const vineyardOrFarmLocation = String(formData.get("vineyardOrFarmLocation") ?? "").trim();
  const harvestDate = String(formData.get("harvestDate") ?? "").trim();

  if (!producerId || !productType || !varietalOrSubtype || !vineyardOrFarmLocation || !harvestDate) {
    return { error: "All fields are required." };
  }

  const context = await getWriteContext();
  const authError = superadminGuardError(context);
  if (authError) {
    return { error: authError };
  }

  const batchId = uid("batch");
  const { error } = await context.client.from("batches").insert({
    batch_id: batchId,
    producer_id: producerId,
    product_type: productType,
    varietal_or_subtype: varietalOrSubtype,
    vineyard_or_farm_location: vineyardOrFarmLocation,
    harvest_date: harvestDate,
    schema_version: "1.0.0"
  });

  if (error) {
    if (shouldUseDevApiFallback(error, context)) {
      const apiResult = await postToTraceApi("/batches", {
        batchId,
        producerId,
        productType,
        varietalOrSubtype,
        vineyardOrFarmLocation,
        harvestDate,
        schemaVersion: "1.0.0"
      });
      if (!apiResult.ok) {
        return { error: apiResult.error };
      }
    } else {
      return { error: writeErrorMessage(error, context) };
    }
  }

  revalidatePath("/portal/producer");
  redirect(`/portal/producer/batch/${batchId}`);
}

// ─── Add Batch Event ─────────────────────────────────────────

export async function addBatchEvent(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const batchId = String(formData.get("batchId") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "").trim();
  const issuerId = String(formData.get("issuerId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!batchId || !eventType || !issuerId) {
    return { error: "Batch, event type, and issuer are required." };
  }

  const context = await getWriteContext();
  const authError = superadminGuardError(context);
  if (authError) {
    return { error: authError };
  }

  // Get previous event hash for chain linkage
  const { data: prevEvents } = await context.client
    .from("batch_events")
    .select("event_hash")
    .eq("batch_id", batchId)
    .order("event_timestamp", { ascending: false })
    .limit(1);
  const prevEventHash = prevEvents?.[0]?.event_hash ?? null;

  const eventId = uid("evt");
  const timestamp = new Date().toISOString();
  const payload: Record<string, unknown> = notes ? { notes } : {};

  const eventHash = computeEventHash({ eventId, batchId, issuerId, eventType, timestamp, payload });
  // MVP signature: SHA-256 of key fields (not a real cryptographic wallet signature)
  const signature = sha256hex(`${issuerId}:${batchId}:${eventType}:${timestamp}`);

  const { error } = await context.client.from("batch_events").insert({
    event_id: eventId,
    batch_id: batchId,
    event_type: eventType,
    issuer_id: issuerId,
    event_timestamp: timestamp,
    payload,
    document_refs: [],
    prev_event_hash: prevEventHash,
    signature,
    event_hash: eventHash
  });

  if (error) {
    if (shouldUseDevApiFallback(error, context)) {
      const apiResult = await postToTraceApi("/events", {
        schemaVersion: "1.0.0",
        eventId,
        batchId,
        eventType,
        issuerId,
        timestamp,
        payload,
        documentRefs: [],
        prevEventHash: prevEventHash ?? undefined,
        signature
      });
      if (!apiResult.ok) {
        return { error: apiResult.error };
      }
    } else {
      return { error: writeErrorMessage(error, context) };
    }
  }

  revalidatePath(`/portal/producer/batch/${batchId}`);
  revalidatePath(`/verify/${batchId}`);
  return { success: true };
}

// ─── Create Issuer ───────────────────────────────────────────

export async function createIssuer(formData: FormData) {
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const walletAddress = String(formData.get("walletAddress") ?? "").trim();
  const trusted = formData.get("trusted") === "true";

  // Collect roles (checkboxes named "roles")
  const roles = formData.getAll("roles").map(String).filter(Boolean);

  if (!organizationName) {
    return { error: "Organization name is required." };
  }

  const context = await getWriteContext();
  const authError = superadminGuardError(context);
  if (authError) {
    return { error: authError };
  }

  const issuerId = uid("issuer");
  const payload = {
    issuer_id: issuerId,
    organization_name: organizationName,
    wallet_address: walletAddress || "",
    roles,
    trusted
  };

  const firstInsert = await context.client
    .from("issuers")
    .insert(payload);

  let error = firstInsert.error;
  if (isTableMissing(error)) {
    const fallbackInsert = await context.client
      .from("issuer_attestations")
      .insert(payload);
    error = fallbackInsert.error;
  }

  if (error) {
    if (shouldUseDevApiFallback(error, context)) {
      if (roles.length === 0) {
        return { error: "Select at least one issuer role." };
      }
      const apiResult = await postToTraceApi("/issuers", {
        issuerId,
        organizationName,
        walletAddress: normalizeWalletForApi(walletAddress),
        roles,
        trusted
      });
      if (!apiResult.ok) {
        return { error: apiResult.error };
      }
    } else {
      return { error: writeErrorMessage(error, context) };
    }
  }

  revalidatePath("/portal/issuer");
  redirect("/portal/issuer");
}

// ─── Login with magic link ───────────────────────────────────

export async function sendMagicLink(
  prevState: { error?: string; sent?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; sent?: boolean }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = normalizeNextPath(
    String(formData.get("next") ?? "/dashboard").trim()
  );
  if (!email || !email.includes("@")) {
    return { error: "A valid email is required." };
  }

  const callbackUrl = new URL("/auth/callback", resolveSiteUrl());
  callbackUrl.searchParams.set("next", nextPath);

  const sb = getServerSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true
    }
  });

  if (error) {
    if (
      isDevSuperadminBypassEnabled() &&
      error.message.toLowerCase().includes("rate limit")
    ) {
      return {
        error: `${error.message} Use the local superadmin bypass button below.`
      };
    }
    return { error: error.message };
  }

  return { sent: true };
}

export async function loginAsDevSuperadmin(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null | never> {
  const nextPath = normalizeNextPath(
    String(formData.get("next") ?? "/dashboard").trim()
  );

  if (!isDevSuperadminBypassEnabled()) {
    return {
      error:
        "Local superadmin bypass is disabled. Set DEV_SUPERADMIN_BYPASS=true."
    };
  }

  cookies().set(
    DEV_SUPERADMIN_BYPASS_COOKIE,
    expectedDevSuperadminBypassToken(),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/"
    }
  );

  redirect(nextPath);
}
