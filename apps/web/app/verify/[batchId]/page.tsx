import Image from "next/image";
import {
  getBatches,
  getBatchEvents,
  getVerification,
  getProducers,
  getChainTransactions,
  getIssuers,
  type BatchSummary,
  type BatchEventView,
  type IssuerView
} from "../../../lib/api";

const eventLabels: Record<string, string> = {
  BATCH_CREATED: "Batch Created",
  HARVEST_RECORDED: "Harvest Recorded",
  PROCESSING_RECORDED: "Processing Recorded",
  BOTTLING_RECORDED: "Bottling Recorded",
  SHIPMENT_RECORDED: "Shipment Recorded",
  THIRD_PARTY_VERIFIED: "Third-Party Verified"
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function TrustIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: ok ? "rgba(45,90,39,0.06)" : "rgba(212,131,143,0.08)",
        border: `1px solid ${ok ? "rgba(45,90,39,0.16)" : "rgba(212,131,143,0.2)"}`,
        borderRadius: 8
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: ok ? "#2D5A27" : "#D4838F",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        {ok ? "\u2713" : "!"}
      </span>
      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: ok ? "#2D5A27" : "#9B3A47" }}>
        {label}
      </span>
    </div>
  );
}

function TrustTierBadge({ roles }: { roles: string[] }) {
  const roleSet = new Set(roles);
  let label: string;
  let color: string;
  let bg: string;

  if (roleSet.has("GOVERNMENT") || roleSet.has("AUTHORITY")) {
    label = "Authority-attested";
    color = "#6B4E2A";
    bg = "rgba(196,162,53,0.15)";
  } else if (roleSet.has("LABORATORY") || roleSet.has("CERTIFIER")) {
    label = "Lab-attested";
    color = "#2D4A8A";
    bg = "rgba(45,74,138,0.1)";
  } else {
    label = "Self-attested";
    color = "#2D5A27";
    bg = "rgba(45,90,39,0.09)";
  }

  return (
    <span
      style={{
        padding: "2px 9px",
        borderRadius: 6,
        fontSize: "0.72rem",
        fontWeight: 700,
        color,
        background: bg,
        flexShrink: 0
      }}
    >
      {label}
    </span>
  );
}

export default async function VerifyPage({
  params
}: {
  params: { batchId: string };
}) {
  const [batches, verification, events, producers, txs, issuers] = await Promise.all([
    getBatches(),
    getVerification(params.batchId),
    getBatchEvents(params.batchId),
    getProducers(),
    getChainTransactions(),
    getIssuers()
  ]);

  const batch = batches.find((b: BatchSummary) => b.batchId === params.batchId);
  const producer = batch ? producers.find((p) => p.producerId === batch.producerId) : null;
  const issuerMap = new Map<string, IssuerView>(issuers.map((i) => [i.issuerId, i]));

  const batchTxs = txs.filter((t) =>
    events.some((e: BatchEventView) => e.eventId === t.eventId)
  );
  const confirmedTx = batchTxs.find((t) => t.status === "CONFIRMED");

  if (!verification || !batch) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF9F6",
          flexDirection: "column",
          gap: 12
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(212,131,143,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#D4838F",
            fontSize: 18,
            fontWeight: 700
          }}
        >
          ?
        </div>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Batch Not Found</h1>
        <p style={{ margin: 0, color: "#4A5568" }}>
          This batch cannot be verified at this time.
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAF9F6 0%, #F0EDE6 60%, #FAF9F6 100%)",
        padding: "40px 20px 60px"
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image
            src="/logo.png"
            alt="Terroir Trace Verified"
            width={53}
            height={56}
            style={{ marginBottom: 12 }}
            priority
          />
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#2D5A27",
              fontWeight: 700
            }}
          >
            TerroirOS Trace &middot; Verified
          </p>
        </div>

        {/* Producer */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 14,
            padding: 22,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A5568", fontWeight: 600 }}>
            Producer
          </p>
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
            {producer?.legalName ?? "Unknown Producer"}
          </h2>
          <p style={{ margin: "2px 0 0", color: "#4A5568", fontSize: "0.9rem" }}>
            {producer?.region ? `${producer.region}, ` : ""}
            {producer?.countryCode ?? ""}
          </p>
        </section>

        {/* Batch details */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 14,
            padding: 22,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A5568", fontWeight: 600 }}>
            Batch
          </p>
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "1.2rem" }}>
            {batch.varietalOrSubtype}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: "0.88rem", color: "#4A5568" }}>
            <span>{batch.productType}</span>
            <span>{batch.vineyardOrFarmLocation}</span>
            <span>Harvest: {formatDate(batch.harvestDate)}</span>
          </div>
        </section>

        {/* Trust summary */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 14,
            padding: 22,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A5568", fontWeight: 600 }}>
            Trust Summary
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TrustIndicator ok={verification.signaturesValid} label={verification.signaturesValid ? "Signatures Valid" : "Signature Issue"} />
            <TrustIndicator ok={verification.trustedIssuersOnly} label={verification.trustedIssuersOnly ? "Trusted Issuers" : "Untrusted Issuer"} />
            <TrustIndicator ok={verification.hashesConsistent} label={verification.hashesConsistent ? "Hashes Consistent" : "Hash Mismatch"} />
            <TrustIndicator ok={verification.completeLifecycle} label={verification.completeLifecycle ? "Lifecycle Complete" : "Incomplete"} />
          </div>
        </section>

        {/* Event timeline with trust tiers */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 14,
            padding: 22,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A5568", fontWeight: 600 }}>
            Trace Timeline
          </p>
          {events.length === 0 ? (
            <p style={{ margin: 0, color: "#4A5568" }}>No events recorded.</p>
          ) : (
            <div style={{ display: "grid", gap: 0 }}>
              {events.map((event: BatchEventView, i: number) => {
                const issuer = issuerMap.get(event.issuerId);
                return (
                  <div
                    key={event.eventId}
                    style={{ display: "flex", gap: 14, paddingBottom: i === events.length - 1 ? 0 : 16 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2D5A27", flexShrink: 0 }} />
                      {i < events.length - 1 && (
                        <div style={{ width: 2, flex: 1, background: "rgba(45,90,39,0.2)" }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", lineHeight: "12px" }}>
                          {eventLabels[event.eventType] ?? event.eventType}
                        </p>
                        <TrustTierBadge roles={issuer?.roles ?? []} />
                      </div>
                      <p style={{ margin: "4px 0 0", color: "#4A5568", fontSize: "0.82rem" }}>
                        {issuer?.organizationName ?? event.issuerId}
                        {" "}&middot;{" "}
                        {formatDateTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Chain proof */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 14,
            padding: 22,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A5568", fontWeight: 600 }}>
            Chain Proof
          </p>
          <div style={{ fontSize: "0.9rem", color: "#4A5568" }}>
            <p style={{ margin: "0 0 4px" }}>
              Anchoring:{" "}
              <strong style={{ color: verification.chainAnchoringStatus === "COMPLETE" ? "#2D5A27" : "#C4A235" }}>
                {verification.chainAnchoringStatus}
              </strong>
            </p>
            <p style={{ margin: "0 0 4px" }}>
              Hash match:{" "}
              <strong style={{ color: verification.hashesConsistent ? "#2D5A27" : "#9B3A47" }}>
                {verification.hashesConsistent ? "PASS" : "FAIL"}
              </strong>
            </p>
            {confirmedTx && (
              <>
                <p style={{ margin: "0 0 4px" }}>
                  Block:{" "}
                  <code style={{ background: "rgba(74,85,104,0.08)", borderRadius: 4, padding: "1px 6px", fontSize: "0.82rem" }}>
                    {confirmedTx.blockNumber}
                  </code>
                </p>
                <a
                  href={`https://amoy.polygonscan.com/tx/${confirmedTx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2D5A27", textDecoration: "underline", fontSize: "0.88rem" }}
                >
                  View on Polygonscan &rarr;
                </a>
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 0 0", color: "#A0AEC0", fontSize: "0.82rem" }}>
          <p style={{ margin: 0 }}>
            Verified by TerroirOS Trace &middot; Open-source provenance infrastructure
          </p>
          <p style={{ margin: "4px 0 0" }}>
            Scan the QR code on the product to return to this page.
          </p>
        </div>
      </div>
    </main>
  );
}
