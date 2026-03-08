import { createHash } from "node:crypto";
import type { BatchEvent } from "./trace.types";

function normalizeRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeRecord(entry));
  }
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.keys(input)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeRecord(input[key]);
        return acc;
      }, {});
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeRecord(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashTraceEvent(event: BatchEvent): string {
  const canonical = stableStringify({
    ...event,
    signature: undefined
  });
  return sha256Hex(canonical);
}
