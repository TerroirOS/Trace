"use client";

import { useFormState, useFormStatus } from "react-dom";

const ROLES = [
  { value: "PRODUCER", label: "Producer (self-attested)" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "CERTIFIER", label: "Certifier" },
  { value: "GOVERNMENT", label: "Government Authority" },
  { value: "AUTHORITY", label: "Industry Authority" }
];

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
        background: pending ? "rgba(196,162,53,0.5)" : "#C4A235",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer"
      }}
    >
      {pending ? "Registering…" : "Register Issuer"}
    </button>
  );
}

type ActionResult = { error: string } | null;

export default function CreateIssuerForm({
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
        <label htmlFor="organizationName" style={labelStyle}>
          Organization name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          placeholder="e.g. Georgian Wine National Agency"
          style={fieldStyle}
        />
      </div>

      <div>
        <label htmlFor="walletAddress" style={labelStyle}>
          Wallet address{" "}
          <span style={{ color: "#A0AEC0", fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="walletAddress"
          name="walletAddress"
          type="text"
          placeholder="0x..."
          style={fieldStyle}
        />
        <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#A0AEC0" }}>
          Required for on-chain attestation signing. Leave blank for off-chain only.
        </p>
      </div>

      <div>
        <label style={labelStyle}>Roles</label>
        <div style={{ display: "grid", gap: 8 }}>
          {ROLES.map((role) => (
            <label
              key={role.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "#FAF9F6",
                border: "1px solid rgba(74,85,104,0.14)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              <input
                type="checkbox"
                name="roles"
                value={role.value}
                style={{ width: 16, height: 16, accentColor: "#C4A235", cursor: "pointer" }}
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Trust status</label>
        <div style={{ display: "flex", gap: 10 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: "#FAF9F6",
              border: "1px solid rgba(74,85,104,0.14)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.9rem",
              flex: 1
            }}
          >
            <input type="radio" name="trusted" value="true" defaultChecked style={{ accentColor: "#2D5A27" }} />
            Trusted
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: "#FAF9F6",
              border: "1px solid rgba(74,85,104,0.14)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.9rem",
              flex: 1
            }}
          >
            <input type="radio" name="trusted" value="false" style={{ accentColor: "#D4838F" }} />
            Untrusted
          </label>
        </div>
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
          href="/portal/issuer"
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
