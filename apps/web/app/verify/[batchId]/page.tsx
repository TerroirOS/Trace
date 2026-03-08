import { getBatchEvents, getVerification } from "../../../lib/api";

function TrustBadge({
  ok,
  label
}: {
  ok: boolean;
  label: string;
}): JSX.Element {
  return <span className={`badge ${ok ? "ok" : "warn"}`}>{label}</span>;
}

export default async function VerifyPage({
  params
}: {
  params: { batchId: string };
}) {
  const verification = await getVerification(params.batchId);
  const events = await getBatchEvents(params.batchId);

  if (!verification) {
    return (
      <main className="container">
        <h1>Batch not found</h1>
        <p>The requested batch cannot be verified at this time.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Public verification: {verification.batchId}</h1>
      <div className="card">
        <TrustBadge
          ok={verification.signaturesValid}
          label={verification.signaturesValid ? "Signatures valid" : "Signature issue"}
        />
        <TrustBadge
          ok={verification.trustedIssuersOnly}
          label={
            verification.trustedIssuersOnly
              ? "Trusted issuers"
              : "Untrusted issuer detected"
          }
        />
        <TrustBadge
          ok={verification.hashesConsistent}
          label={verification.hashesConsistent ? "Hashes consistent" : "Hash mismatch"}
        />
        <TrustBadge
          ok={verification.completeLifecycle}
          label={verification.completeLifecycle ? "Lifecycle complete" : "Lifecycle incomplete"}
        />
        <p>Chain anchoring: {verification.chainAnchoringStatus}</p>
      </div>

      <div className="card">
        <h2>Trace timeline</h2>
        {events.length === 0 ? (
          <p>No events recorded yet.</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.eventId}>
                {new Date(event.timestamp).toLocaleString()} - {event.eventType} by{" "}
                {event.issuerId}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Verifier notes</h3>
        <ul>
          {verification.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
