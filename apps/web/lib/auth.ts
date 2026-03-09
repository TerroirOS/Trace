import type { User } from "@supabase/supabase-js";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

function userRoleValues(user: User): string[] {
  const appMetadata = metadataRecord(user.app_metadata);
  const userMetadata = metadataRecord(user.user_metadata);

  const roles = [
    ...parseStringArray(appMetadata.roles),
    ...parseStringArray(userMetadata.roles)
  ];

  if (typeof appMetadata.role === "string") {
    roles.push(appMetadata.role);
  }
  if (typeof userMetadata.role === "string") {
    roles.push(userMetadata.role);
  }

  return roles.map(normalize);
}

export function superadminAllowlist(): Set<string> {
  const configured = process.env.SUPERADMIN_EMAILS ?? "";
  const emails = configured
    .split(",")
    .map((email) => normalize(email))
    .filter(Boolean);

  return new Set(emails);
}

/**
 * Superadmin resolution order:
 * 1) explicit email allowlist (SUPERADMIN_EMAILS)
 * 2) user role metadata contains "superadmin"
 * 3) dev fallback: if allowlist is empty, any authenticated user is treated as superadmin
 */
export function isSuperadminUser(user: User | null): boolean {
  if (!user) {
    return false;
  }

  const allowlist = superadminAllowlist();
  const email = normalize(user.email ?? "");
  if (email && allowlist.has(email)) {
    return true;
  }

  const roleSet = new Set(userRoleValues(user));
  if (roleSet.has("superadmin")) {
    return true;
  }

  return allowlist.size === 0;
}
