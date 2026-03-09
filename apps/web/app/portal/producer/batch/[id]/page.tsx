import Button from "../../../../../components/Button";
import AddEventForm from "../../../../../components/AddEventForm";
import QRCode from "../../../../../components/QRCode";
import CopyButton from "../../../../../components/CopyButton";
import {
  getBatches,
  getBatchEvents,
  getVerification,
  getChainTransactions,
  getIssuers,
  type BatchSummary,
  type BatchEventView,
  type IssuerView
} from "../../../../../lib/api";

const lifecycleSteps = [
  { key: "BATCH_CREATED", label: "Batch Created" },
  { key: "HARVEST_RECORDED", label: "Harvest" },
  { key: "PROCESSING_RECORDED", label: "Processing" },
  { key: "BOTTLING_RECORDED", label: "Bottling" },
  { key: "SHIPMENT_RECORDED", label: "Shipment" }
];

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function trustTier(roles: string[]): { label: string; color: string; bg: string } {
  const roleSet = new Set(roles);
  if (roleSet.has("GOVERNMENT") || roleSet.has("AUTHORITY")) {
    return { label: "Authority-attested", color: "#6B4E2A", bg: "rgba(196,162,53,0.12)" };
  }
  if (roleSet.has("LABORATORY") || roleSet.has("CERTIFIER")) {
    return { label: "Lab-attested", color: "#2D4A8A", bg: "rgba(45,74,138,0.08)" };
  }
  return { label: "Self-attested", color: "#2D5A27", bg: "rgba(45,90,39,0.08)" };
}

export default async function BatchDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [batches, events, verification, txs, issuers] = await Promise.all([
    getBatches(),
    getBatchEvents(params.id),
    getVerification(params.id),
    getChainTransactions(),
    getIssuers()
  ]);

  const batch = batches.find((b: BatchSummary) => b.batchId === params.id);

  if (!batch) {
    return (
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1>Batch not found</h1>
        <Button href="/portal/producer" variant="secondary">
          Back to Portal
        </Button>
      </main>
    );
  }

  const completedTypes = events.map((e: BatchEventView) => e.eventType);
  const completedSet = new Set(completedTypes);
  const issuerMap = new Map<string, IssuerView>(issuers.map((i) => [i.issuerId, i]));
  const batchTxs = txs.filter((t) =>
    events.some((e: BatchEventView) => e.eventId === t.eventId)
  );
  const confirmedTx = batchTxs.find((t) => t.status === "CONFIRMED");
  const verifyUrl = `/verify/${batch.batchId}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "32px 20px 56px",
        background: "linear-gradient(180deg, #FAF9F6, #F0EDE6)"
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Back nav */}
        <div style={{ marginBottom: 16 }}>
          <Button href="/portal/producer" variant="ghost" size="sm">
            &larr; Back to Portal
          </Button>
        </div>

        {/* Batch metadata */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#2D5A27",
              fontWeight: 700
            }}
          >
            Batch Detail
          </p>
          <h1
            style={{
              margin: "6px 0 4px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.6rem"
            }}
          >
            {batch.varietalOrSubtype}
          </h1>
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              color: "#4A5568",
              fontSize: "0.9rem"
            }}
          >
            <span>{batch.productType}</span>
            <span>{batch.vineyardOrFarmLocation}</span>
            <span>Harvest: {formatDate(batch.harvestDate)}</span>
            <code
              style={{
                background: "rgba(74,85,104,0.08)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: "0.82rem"
              }}
            >
              {batch.batchId}
            </code>
          </div>
        </section>

        {/* Lifecycle timeline */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem"
            }}
          >
            Lifecycle
          </h2>
          <div style={{ display: "flex", gap: 0 }}>
            {lifecycleSteps.map((step, i) => {
              const done = completedSet.has(step.key);
              const isLast = i === lifecycleSteps.length - 1;
              return (
                <div
                  key={step.key}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative"
                  }}
                >
                  {!isLast && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: "50%",
                        width: "100%",
                        height: 3,
                        background: done ? "#2D5A27" : "rgba(74,85,104,0.12)",
                        zIndex: 0
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: done ? "#2D5A27" : "#F0EDE6",
                      border: done
                        ? "3px solid #2D5A27"
                        : "3px solid rgba(74,85,104,0.2)",
                      zIndex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: done ? "#fff" : "#A0AEC0",
                      fontWeight: 700
                    }}
                  >
                    {done ? "\u2713" : i + 1}
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "0.72rem",
                      textAlign: "center",
                      color: done ? "#2D5A27" : "#4A5568",
                      fontWeight: done ? 700 : 500,
                      lineHeight: 1.2
                    }}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Record Event */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem"
            }}
          >
            Record Event
          </h2>
          <AddEventForm
            batchId={batch.batchId}
            completedTypes={completedTypes}
            issuers={issuers}
          />
        </section>

        {/* QR + Chain side by side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20
          }}
        >
          {/* QR verification */}
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(74,85,104,0.12)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 2px 8px rgba(26,26,46,0.04)",
              textAlign: "center"
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontFamily: "var(--font-serif)",
                fontSize: "1.05rem",
                textAlign: "left"
              }}
            >
              QR Verification
            </h2>
            <QRCode url={`${baseUrl}${verifyUrl}`} size={120} />
            <code
              style={{
                display: "block",
                fontSize: "0.74rem",
                color: "#4A5568",
                margin: "10px 0 12px",
                wordBreak: "break-all"
              }}
            >
              {verifyUrl}
            </code>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Button href={verifyUrl} variant="primary" size="sm">
                Open Verifier
              </Button>
              <CopyButton text={`${baseUrl}${verifyUrl}`} />
            </div>
          </section>

          {/* Chain anchoring */}
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(74,85,104,0.12)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontFamily: "var(--font-serif)",
                fontSize: "1.05rem"
              }}
            >
              Chain Anchoring
            </h2>
            <div style={{ fontSize: "0.9rem", color: "#4A5568" }}>
              <div style={{ marginBottom: 8 }}>
                <span>Status: </span>
                <strong
                  style={{
                    color:
                      verification?.chainAnchoringStatus === "COMPLETE"
                        ? "#2D5A27"
                        : verification?.chainAnchoringStatus === "PARTIAL"
                          ? "#C4A235"
                          : "#4A5568"
                  }}
                >
                  {verification?.chainAnchoringStatus ?? "N/A"}
                </strong>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span>Events: </span>
                <strong>{batchTxs.length}</strong> transactions
              </div>
              {confirmedTx && (
                <>
                  <div style={{ marginBottom: 4 }}>
                    Block:{" "}
                    <code
                      style={{
                        background: "rgba(74,85,104,0.08)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontSize: "0.8rem"
                      }}
                    >
                      {confirmedTx.blockNumber}
                    </code>
                  </div>
                  <a
                    href={`https://amoy.polygonscan.com/tx/${confirmedTx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.82rem",
                      color: "#2D5A27",
                      textDecoration: "underline"
                    }}
                  >
                    View on Polygonscan &rarr;
                  </a>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Attestation history with trust tiers */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem"
            }}
          >
            Attestation History
          </h2>
          {events.length === 0 ? (
            <p style={{ margin: 0, color: "#4A5568" }}>No events recorded yet. Use the form above to add the first event.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {events.map((event: BatchEventView) => {
                const issuer = issuerMap.get(event.issuerId);
                const tier = trustTier(issuer?.roles ?? []);
                return (
                  <div
                    key={event.eventId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "#FAF9F6",
                      border: "1px solid rgba(74,85,104,0.1)",
                      borderRadius: 8,
                      fontSize: "0.88rem",
                      flexWrap: "wrap",
                      gap: 8
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>{event.eventType.replace(/_/g, " ")}</span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          color: tier.color,
                          background: tier.bg
                        }}
                      >
                        {tier.label}
                      </span>
                      <span style={{ color: "#4A5568" }}>
                        {issuer?.organizationName ?? event.issuerId}
                      </span>
                    </div>
                    <span style={{ color: "#A0AEC0", fontSize: "0.82rem" }}>
                      {formatDateTime(event.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
