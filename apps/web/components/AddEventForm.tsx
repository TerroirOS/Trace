"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addBatchEvent } from "../lib/actions";
import type { IssuerView } from "../lib/api";

const LIFECYCLE_STEPS = [
  "BATCH_CREATED",
  "HARVEST_RECORDED",
  "PROCESSING_RECORDED",
  "BOTTLING_RECORDED",
  "SHIPMENT_RECORDED"
] as const;

const EVENT_LABELS: Record<string, string> = {
  HARVEST_RECORDED: "Harvest Recorded",
  PROCESSING_RECORDED: "Processing Recorded",
  BOTTLING_RECORDED: "Bottling Recorded",
  SHIPMENT_RECORDED: "Shipment Recorded",
  THIRD_PARTY_VERIFIED: "Third-Party Verification"
};

const fieldStyle = {
  display: "block" as const,
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(74,85,104,0.22)",
  borderRadius: 8,
  fontSize: "0.9rem",
  background: "#FAF9F6",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
  color: "#1A1A2E"
};

const labelStyle = {
  display: "block" as const,
  fontSize: "0.82rem",
  fontWeight: 600 as const,
  color: "#1A1A2E",
  marginBottom: 4
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: "9px 22px",
        background: pending ? "rgba(45,90,39,0.5)" : "#2D5A27",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontSize: "0.88rem",
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer"
      }}
    >
      {pending ? "Recording…" : "Record Event"}
    </button>
  );
}

export default function AddEventForm({
  batchId,
  completedTypes,
  issuers
}: {
  batchId: string;
  completedTypes: string[];
  issuers: IssuerView[];
}) {
  const [state, formAction] = useFormState(addBatchEvent, null);

  // Determine available event types (not yet recorded for lifecycle steps)
  const completedSet = new Set(completedTypes);
  const available = [
    ...LIFECYCLE_STEPS.filter((t) => !completedSet.has(t)),
    "THIRD_PARTY_VERIFIED"
  ];

  if (available.length === 0) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(45,90,39,0.06)",
          border: "1px solid rgba(45,90,39,0.16)",
          borderRadius: 8,
          color: "#2D5A27",
          fontSize: "0.88rem",
          fontWeight: 600
        }}
      >
        All lifecycle events have been recorded.
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="batchId" value={batchId} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="eventType" style={labelStyle}>
            Event type
          </label>
          <select id="eventType" name="eventType" required style={fieldStyle}>
            <option value="">Choose…</option>
            {available.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="issuerId" style={labelStyle}>
            Issuer
          </label>
          <select id="issuerId" name="issuerId" required style={fieldStyle}>
            <option value="">Choose issuer…</option>
            {issuers.map((i) => (
              <option key={i.issuerId} value={i.issuerId}>
                {i.organizationName}
                {!i.trusted ? " (untrusted)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" style={labelStyle}>
          Notes <span style={{ color: "#A0AEC0", fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="e.g. Harvest completed in optimal conditions, brix 24°"
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </div>

      {state?.error && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(212,131,143,0.1)",
            border: "1px solid rgba(212,131,143,0.25)",
            borderRadius: 8,
            color: "#9B3A47",
            fontSize: "0.85rem"
          }}
        >
          {state.error}
        </div>
      )}

      {state?.success && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(45,90,39,0.08)",
            border: "1px solid rgba(45,90,39,0.18)",
            borderRadius: 8,
            color: "#2D5A27",
            fontSize: "0.85rem",
            fontWeight: 600
          }}
        >
          Event recorded successfully.
        </div>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
