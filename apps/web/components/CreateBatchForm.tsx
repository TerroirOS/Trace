"use client";

import { useFormState, useFormStatus } from "react-dom";

const PRODUCT_TYPES = [
  "Wine",
  "Sparkling Wine",
  "Brandy / Chacha",
  "Olive Oil",
  "Honey",
  "Tea",
  "Other"
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
        background: pending ? "rgba(45,90,39,0.5)" : "#2D5A27",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer",
        letterSpacing: "0.02em"
      }}
    >
      {pending ? "Creating…" : "Create Batch"}
    </button>
  );
}

type ActionResult = { error: string } | null;

export default function CreateBatchForm({
  producerId,
  action
}: {
  producerId: string;
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
      <input type="hidden" name="producerId" value={producerId} />

      <div>
        <label htmlFor="productType" style={labelStyle}>
          Product type
        </label>
        <select id="productType" name="productType" required style={fieldStyle}>
          <option value="">Select a product type…</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="varietalOrSubtype" style={labelStyle}>
          Varietal / subtype
        </label>
        <input
          id="varietalOrSubtype"
          name="varietalOrSubtype"
          type="text"
          required
          placeholder="e.g. Rkatsiteli, Saperavi, Amber Qvevri"
          style={fieldStyle}
        />
      </div>

      <div>
        <label htmlFor="vineyardOrFarmLocation" style={labelStyle}>
          Vineyard / farm location
        </label>
        <input
          id="vineyardOrFarmLocation"
          name="vineyardOrFarmLocation"
          type="text"
          required
          placeholder="e.g. Kakheti, Telavi district"
          style={fieldStyle}
        />
      </div>

      <div>
        <label htmlFor="harvestDate" style={labelStyle}>
          Harvest date
        </label>
        <input
          id="harvestDate"
          name="harvestDate"
          type="date"
          required
          style={fieldStyle}
        />
      </div>

      {/* Error message */}
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
