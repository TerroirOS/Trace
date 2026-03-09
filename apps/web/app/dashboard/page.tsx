import Button from "../../components/Button";
import {
  getBatches,
  getProducers,
  getIssuers,
  getChainTransactions,
  getBatchEvents,
  type BatchSummary,
  type BatchEventView
} from "../../lib/api";

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

const eventLabels: Record<string, string> = {
  BATCH_CREATED: "Batch Created",
  HARVEST_RECORDED: "Harvest",
  PROCESSING_RECORDED: "Processing",
  BOTTLING_RECORDED: "Bottling",
  SHIPMENT_RECORDED: "Shipment",
  THIRD_PARTY_VERIFIED: "3rd-Party Verified"
};

export default async function DashboardPage() {
  const [batches, producers, issuers, txs] = await Promise.all([
    getBatches(),
    getProducers(),
    getIssuers(),
    getChainTransactions()
  ]);

  // Gather recent events across all batches (parallel fetch, limit per batch)
  const batchEventPairs = await Promise.all(
    batches.slice(0, 20).map(async (b: BatchSummary) => {
      const events = await getBatchEvents(b.batchId);
      return events.map((e: BatchEventView) => ({ ...e, batch: b }));
    })
  );
  const allEvents = batchEventPairs
    .flat()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  // Chain health
  const confirmedTxs = txs.filter((t) => t.status === "CONFIRMED").length;
  const pendingTxs = txs.filter(
    (t) => t.status === "QUEUED" || t.status === "SUBMITTED"
  ).length;
  const failedTxs = txs.filter((t) => t.status === "FAILED").length;
  const chainCovPct =
    txs.length === 0 ? 0 : Math.round((confirmedTxs / txs.length) * 100);

  const trustedIssuers = issuers.filter((i) => i.trusted).length;
  const totalEvents = allEvents.length;

  const kpis = [
    { label: "Producers", value: producers.length, color: "#2D5A27", href: "/portal/producer" },
    { label: "Batches", value: batches.length, color: "#2D5A27", href: "/portal/producer" },
    { label: "Trusted Issuers", value: trustedIssuers, color: "#C4A235", href: "/portal/issuer" },
    { label: "Chain Coverage", value: `${chainCovPct}%`, color: "#C4A235", href: null },
    { label: "Pending Txs", value: pendingTxs, color: "#4A5568", href: null },
    { label: "Failed Txs", value: failedTxs, color: failedTxs > 0 ? "#9B3A47" : "#4A5568", href: null }
  ];

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "32px 20px 56px",
        background:
          "radial-gradient(80rem 30rem at 50% 0%, rgba(196,162,53,0.05), transparent 55%), linear-gradient(180deg, #FAF9F6, #F0EDE6)"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 16,
            padding: 28,
            marginBottom: 20,
            boxShadow: "0 2px 10px rgba(26,26,46,0.05)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#C4A235",
                  fontWeight: 700
                }}
              >
                Admin Overview
              </p>
              <h1
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.5rem, 2.2vw, 2rem)"
                }}
              >
                TerroirOS Dashboard
              </h1>
              <p style={{ margin: "4px 0 0", color: "#4A5568", fontSize: "0.9rem" }}>
                System-wide overview across all producers and batches.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button href="/portal/producer/batch/new" variant="primary" size="sm">
                + New Batch
              </Button>
              <Button href="/portal/issuer/new" variant="secondary" size="sm">
                + Register Issuer
              </Button>
            </div>
          </div>
        </section>

        {/* KPI grid */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 20
          }}
        >
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                border: "1px solid rgba(74,85,104,0.12)",
                borderRadius: 12,
                padding: 18,
                boxShadow: "0 2px 8px rgba(26,26,46,0.04)",
                cursor: kpi.href ? "pointer" : "default",
                textDecoration: "none"
              }}
            >
              {kpi.href ? (
                <a href={kpi.href} style={{ textDecoration: "none" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#4A5568",
                      fontWeight: 700
                    }}
                  >
                    {kpi.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: kpi.color
                    }}
                  >
                    {kpi.value}
                  </p>
                </a>
              ) : (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#4A5568",
                      fontWeight: 700
                    }}
                  >
                    {kpi.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: kpi.color
                    }}
                  >
                    {kpi.value}
                  </p>
                </>
              )}
            </div>
          ))}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Producers list */}
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(74,85,104,0.12)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>
                Producers
              </h2>
              <Button href="/portal/producer" variant="ghost" size="sm">
                View all →
              </Button>
            </div>
            {producers.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  background: "#FAF9F6",
                  border: "1px dashed rgba(74,85,104,0.2)",
                  borderRadius: 8,
                  textAlign: "center",
                  color: "#4A5568",
                  fontSize: "0.88rem"
                }}
              >
                <p style={{ margin: "0 0 8px" }}>No producers yet.</p>
                <Button href="/portal/producer/onboard" variant="primary" size="sm">
                  + Add Producer
                </Button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {producers.map((p) => (
                  <div
                    key={p.producerId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "#FAF9F6",
                      border: "1px solid rgba(74,85,104,0.1)",
                      borderRadius: 8
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {p.legalName}
                      </span>
                      <span style={{ color: "#4A5568", fontSize: "0.82rem", marginLeft: 8 }}>
                        {p.region ? `${p.region}, ` : ""}{p.countryCode}
                      </span>
                    </div>
                    <Button href="/portal/producer" variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Chain health */}
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(74,85,104,0.12)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>
              Chain Health
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { label: "Confirmed", value: confirmedTxs, color: "#2D5A27", bg: "rgba(45,90,39,0.08)" },
                { label: "Pending", value: pendingTxs, color: "#C4A235", bg: "rgba(196,162,53,0.1)" },
                { label: "Failed", value: failedTxs, color: "#9B3A47", bg: "rgba(212,131,143,0.1)" },
                { label: "Total", value: txs.length, color: "#4A5568", bg: "rgba(74,85,104,0.06)" }
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 12px",
                    background: row.bg,
                    borderRadius: 8
                  }}
                >
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: row.color }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: row.color
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            {failedTxs > 0 && (
              <p
                style={{
                  margin: "10px 0 0",
                  padding: "8px 12px",
                  background: "rgba(212,131,143,0.08)",
                  border: "1px solid rgba(212,131,143,0.2)",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  color: "#9B3A47"
                }}
              >
                {failedTxs} transaction(s) failed. Start the NestJS API to retry queued events.
              </p>
            )}
          </section>
        </div>

        {/* Recent activity */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>
            Recent Activity
          </h2>
          {allEvents.length === 0 ? (
            <p style={{ margin: 0, color: "#4A5568" }}>
              No events yet. Create a batch and start recording events.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {allEvents.map((event) => (
                <div
                  key={event.eventId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 12px",
                    background: "#FAF9F6",
                    border: "1px solid rgba(74,85,104,0.1)",
                    borderRadius: 8,
                    fontSize: "0.86rem",
                    flexWrap: "wrap",
                    gap: 6
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        background: "rgba(45,90,39,0.08)",
                        color: "#2D5A27"
                      }}
                    >
                      {eventLabels[event.eventType] ?? event.eventType}
                    </span>
                    <span style={{ color: "#4A5568" }}>
                      {event.batch.varietalOrSubtype || event.batch.batchId}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#A0AEC0", fontSize: "0.8rem" }}>
                      {formatDateTime(event.timestamp)}
                    </span>
                    <Button
                      href={`/portal/producer/batch/${event.batch.batchId}`}
                      variant="ghost"
                      size="sm"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
