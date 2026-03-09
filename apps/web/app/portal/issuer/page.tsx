import Button from "../../../components/Button";
import {
  getBatches,
  getBatchEvents,
  getIssuers,
  type BatchSummary,
  type BatchEventView,
  type IssuerView
} from "../../../lib/api";

const eventTypeLabels: Record<string, string> = {
  BATCH_CREATED: "Batch Creation",
  HARVEST_RECORDED: "Harvest Record",
  PROCESSING_RECORDED: "Processing Record",
  BOTTLING_RECORDED: "Bottling Record",
  SHIPMENT_RECORDED: "Shipment Record",
  THIRD_PARTY_VERIFIED: "Third-Party Verification"
};

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

export default async function IssuerPortal() {
  const [issuers, batches] = await Promise.all([getIssuers(), getBatches()]);

  const allEvents: (BatchEventView & { batchId: string })[] = [];
  for (const batch of batches) {
    const events = await getBatchEvents(batch.batchId);
    for (const event of events) {
      allEvents.push({ ...event, batchId: batch.batchId });
    }
  }

  const signedEvents = allEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const trustedCount = issuers.filter((i: IssuerView) => i.trusted).length;

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "32px 20px 56px",
        background:
          "radial-gradient(70rem 28rem at 100% -10%, rgba(196,162,53,0.06), transparent 50%), linear-gradient(180deg, #FAF9F6, #F0EDE6)"
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
            Issuer Portal
          </p>
          <h1
            style={{
              margin: "6px 0 4px",
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.4rem, 2vw, 1.8rem)"
            }}
          >
            Attestation Management
          </h1>
          <p style={{ margin: 0, color: "#4A5568", fontSize: "0.92rem" }}>
            Review, sign, and manage attestations for producer batch events.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button href="/portal/issuer/new" variant="primary" size="sm">
              + Register Issuer
            </Button>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: "0.82rem",
                fontWeight: 600,
                background: "rgba(45,90,39,0.1)",
                color: "#2D5A27"
              }}
            >
              {trustedCount} trusted issuers
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: "0.82rem",
                fontWeight: 600,
                background: "rgba(74,85,104,0.08)",
                color: "#4A5568"
              }}
            >
              {issuers.length} total issuers
            </span>
          </div>
        </section>

        {/* Registered issuers */}
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
              margin: "0 0 12px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem"
            }}
          >
            Registered Issuers
          </h2>
          {issuers.length === 0 ? (
            <p style={{ margin: 0, color: "#4A5568" }}>No issuers registered.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {issuers.map((issuer: IssuerView) => (
                <div
                  key={issuer.issuerId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "#FAF9F6",
                    border: "1px solid rgba(74,85,104,0.1)",
                    borderRadius: 8
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                      {issuer.organizationName}
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        color: "#4A5568",
                        fontSize: "0.82rem"
                      }}
                    >
                      {issuer.roles.join(", ")}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      background: issuer.trusted
                        ? "rgba(45,90,39,0.1)"
                        : "rgba(212,131,143,0.12)",
                      color: issuer.trusted ? "#2D5A27" : "#9B3A47"
                    }}
                  >
                    {issuer.trusted ? "Trusted" : "Untrusted"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending attestation area */}
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
              margin: "0 0 6px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem"
            }}
          >
            Pending Attestation Requests
          </h2>
          <p style={{ margin: "0 0 14px", color: "#4A5568", fontSize: "0.88rem" }}>
            Batches awaiting third-party verification appear here.
          </p>
          <div
            style={{
              padding: 24,
              background: "#FAF9F6",
              border: "1px dashed rgba(196,162,53,0.3)",
              borderRadius: 10,
              textAlign: "center",
              color: "#4A5568",
              fontSize: "0.9rem"
            }}
          >
            <p style={{ margin: "0 0 12px" }}>
              No pending third-party verification requests.
            </p>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#A0AEC0" }}>
              Producers can record a <strong>THIRD_PARTY_VERIFIED</strong> event from the
              batch detail page, selecting your issuer organization.
            </p>
          </div>
        </section>

        {/* Attestation history */}
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
          {signedEvents.length === 0 ? (
            <p style={{ margin: 0, color: "#4A5568" }}>No attestations yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {signedEvents.slice(0, 20).map((event) => (
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
                    fontSize: "0.88rem"
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        background: "rgba(45,90,39,0.08)",
                        color: "#2D5A27"
                      }}
                    >
                      {eventTypeLabels[event.eventType] ?? event.eventType}
                    </span>
                    <span style={{ color: "#4A5568" }}>
                      {event.batchId}
                    </span>
                    <span style={{ color: "#A0AEC0" }}>
                      by {event.issuerId}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#A0AEC0", fontSize: "0.82rem" }}>
                      {formatDateTime(event.timestamp)}
                    </span>
                    <Button
                      href={`/portal/producer/batch/${event.batchId}`}
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
