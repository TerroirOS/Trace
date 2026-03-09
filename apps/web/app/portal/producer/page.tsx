import Button from "../../../components/Button";
import ChainMonitor from "../../../components/ChainMonitor";
import {
  getBatches,
  getProducers,
  getIssuers,
  getChainTransactions,
  getBatchEvents,
  getVerification,
  type BatchSummary,
  type VerificationView
} from "../../../lib/api";

const lifecycleSteps = [
  "BATCH_CREATED",
  "HARVEST_RECORDED",
  "PROCESSING_RECORDED",
  "BOTTLING_RECORDED",
  "SHIPMENT_RECORDED"
] as const;

function integrityScore(v: VerificationView | null): number {
  if (!v) return 0;
  let s = 0;
  if (v.signaturesValid) s += 30;
  if (v.hashesConsistent) s += 30;
  if (v.trustedIssuersOnly) s += 20;
  if (v.completeLifecycle) s += 20;
  return s;
}

function chainLabel(status: string): string {
  if (status === "COMPLETE") return "Anchored";
  if (status === "PARTIAL") return "Partial";
  if (status === "PENDING") return "Pending";
  return "Unknown";
}

function chainColor(status: string): string {
  if (status === "COMPLETE") return "#2D5A27";
  if (status === "PARTIAL") return "#C4A235";
  return "#4A5568";
}

export default async function ProducerPortal() {
  const [batches, producers, issuers, txs] = await Promise.all([
    getBatches(),
    getProducers(),
    getIssuers(),
    getChainTransactions()
  ]);

  const batchDetails = await Promise.all(
    batches.map(async (b: BatchSummary) => {
      const [events, verification] = await Promise.all([
        getBatchEvents(b.batchId),
        getVerification(b.batchId)
      ]);
      const completedSteps = new Set(
        events
          .map((e) => e.eventType)
          .filter((t) => lifecycleSteps.includes(t as (typeof lifecycleSteps)[number]))
      );
      return {
        ...b,
        eventCount: events.length,
        score: integrityScore(verification),
        chainStatus: verification?.chainAnchoringStatus ?? "UNKNOWN",
        ready: Boolean(
          verification?.completeLifecycle &&
            verification.signaturesValid &&
            verification.hashesConsistent &&
            verification.trustedIssuersOnly
        ),
        progress: Math.round((completedSteps.size / lifecycleSteps.length) * 100)
      };
    })
  );

  const confirmedTxs = txs.filter((t) => t.status === "CONFIRMED").length;
  const chainCov = txs.length === 0 ? 0 : Math.round((confirmedTxs / txs.length) * 100);
  const readyCount = batchDetails.filter((b) => b.ready).length;
  const avgScore =
    batchDetails.length === 0
      ? 0
      : Math.round(batchDetails.reduce((s, b) => s + b.score, 0) / batchDetails.length);
  const producer = producers[0];

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "32px 20px 56px",
        background:
          "radial-gradient(80rem 30rem at -10% -15%, rgba(45,90,39,0.06), transparent 55%), linear-gradient(180deg, #FAF9F6, #F0EDE6)"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Profile header */}
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
            Producer Portal
          </p>
          <h1
            style={{
              margin: "6px 0 0",
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.5rem, 2.2vw, 2rem)"
            }}
          >
            {producer?.legalName ?? "Your Winery"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#4A5568", fontSize: "0.92rem" }}>
            {producer?.region ? `${producer.region}, ` : ""}
            {producer?.countryCode ?? "GE"} &middot;{" "}
            {producers.length} producers &middot; {issuers.length} issuers
          </p>
        </section>

        {/* KPI row */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 20
          }}
        >
          {[
            { label: "Total Batches", value: batches.length, color: "#2D5A27" },
            { label: "Verification Ready", value: readyCount, color: "#2D5A27" },
            { label: "Chain Coverage", value: `${chainCov}%`, color: "#C4A235" },
            { label: "Avg Integrity", value: avgScore, color: "#4A5568" }
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                border: "1px solid rgba(74,85,104,0.12)",
                borderRadius: 12,
                padding: 18,
                boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
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
            </div>
          ))}
        </section>

        {/* Action bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "1.25rem"
            }}
          >
            Batch Registry
          </h2>
          <Button href="/portal/producer/batch/new" variant="primary" size="sm">
            + Create New Batch
          </Button>
        </div>

        {/* Chain monitor */}
        <div style={{ marginBottom: 20 }}>
          <ChainMonitor txs={txs} />
        </div>

        {/* Batch cards */}
        {batchDetails.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(74,85,104,0.12)",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              color: "#4A5568"
            }}
          >
            <p style={{ margin: 0 }}>
              No batches yet. Create your first batch to start tracing.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 14
            }}
          >
            {batchDetails.map((batch) => (
              <div
                key={batch.batchId}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(74,85,104,0.12)",
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: "0.95rem"
                      }}
                    >
                      {batch.varietalOrSubtype}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "#4A5568",
                        fontSize: "0.84rem"
                      }}
                    >
                      {batch.productType} &middot; {batch.harvestDate}
                    </p>
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: chainColor(batch.chainStatus),
                      background:
                        batch.chainStatus === "COMPLETE"
                          ? "rgba(45,90,39,0.1)"
                          : batch.chainStatus === "PARTIAL"
                            ? "rgba(196,162,53,0.12)"
                            : "rgba(74,85,104,0.1)"
                    }}
                  >
                    {chainLabel(batch.chainStatus)}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ margin: "14px 0 6px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem",
                      color: "#4A5568",
                      marginBottom: 4
                    }}
                  >
                    <span>Lifecycle</span>
                    <span>{batch.progress}%</span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: "rgba(74,85,104,0.1)",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${batch.progress}%`,
                        borderRadius: 999,
                        background:
                          batch.progress === 100
                            ? "linear-gradient(90deg, #2D5A27, #3A7A32)"
                            : "linear-gradient(90deg, #C4A235, #D4B545)"
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    fontSize: "0.82rem",
                    color: "#4A5568",
                    margin: "10px 0 14px"
                  }}
                >
                  <span>{batch.eventCount} events</span>
                  <span>Score: {batch.score}</span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    href={`/portal/producer/batch/${batch.batchId}`}
                    variant="primary"
                    size="sm"
                  >
                    View Batch
                  </Button>
                  <Button
                    href={`/verify/${batch.batchId}`}
                    variant="secondary"
                    size="sm"
                  >
                    Open Verifier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
