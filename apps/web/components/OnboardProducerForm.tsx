"use client";

import { useFormState, useFormStatus } from "react-dom";

const fieldStyle = {
  display: "block" as const,
  width: "100%",
  padding: "10px 14px",
  border: "1px solid rgba(74,85,104,0.22)",
  borderRadius: 8,
  fontSize: "0.95rem",
  background: "#FAF9F6",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
  color: "#1A1A2E"
};

const labelStyle = {
  display: "block" as const,
  fontSize: "0.85rem",
  fontWeight: 600 as const,
  color: "#1A1A2E",
  marginBottom: 5
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: "11px 28px",
        background: pending ? "rgba(45,90,39,0.5)" : "#2D5A27",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer"
      }}
    >
      {pending ? "Registering…" : "Register Producer"}
    </button>
  );
}

type ActionResult = { error: string } | null;

export default function OnboardProducerForm({
  action
}: {
  action: (formData: FormData) => Promise<{ error: string } | void | never>;
}) {
  const [state, formAction] = useFormState<ActionResult, FormData>(
    async (_: ActionResult, fd: FormData) => {
      const result = await action(fd);
      if (result && "error" in result) return result as ActionResult;
      return null;
    },
    null
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <div>
        <label htmlFor="legalName" style={labelStyle}>
          Legal name
        </label>
        <input
          id="legalName"
          name="legalName"
          type="text"
          required
          placeholder="e.g. Badagoni Winery LLC"
          style={fieldStyle}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div>
          <label htmlFor="countryCode" style={labelStyle}>
            Country code
          </label>
          <input
            id="countryCode"
            name="countryCode"
            type="text"
            required
            defaultValue="GE"
            maxLength={2}
            style={{ ...fieldStyle, textTransform: "uppercase" }}
          />
        </div>
        <div>
          <label htmlFor="region" style={labelStyle}>
            Region{" "}
            <span style={{ color: "#A0AEC0", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="region"
            name="region"
            type="text"
            placeholder="e.g. Kakheti"
            style={fieldStyle}
          />
        </div>
      </div>

      <div>
        <label htmlFor="organizationWallet" style={labelStyle}>
          Organization wallet{" "}
          <span style={{ color: "#A0AEC0", fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="organizationWallet"
          name="organizationWallet"
          type="text"
          placeholder="0x..."
          style={fieldStyle}
        />
        <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#A0AEC0" }}>
          Used for on-chain attestation. Leave blank if not yet set up.
        </p>
      </div>

      {state && "error" in state && state.error && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(212,131,143,0.1)",
            border: "1px solid rgba(212,131,143,0.25)",
            borderRadius: 8,
            color: "#9B3A47",
            fontSize: "0.88rem"
          }}
        >
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <SubmitButton />
        <a
          href="/portal/producer"
          style={{
            padding: "11px 22px",
            color: "#4A5568",
            fontSize: "0.95rem",
            fontWeight: 600,
            textDecoration: "none",
            borderRadius: 10,
            background: "rgba(74,85,104,0.08)"
          }}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
