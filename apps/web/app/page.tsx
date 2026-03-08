export default function HomePage() {
  return (
    <main className="container">
      <h1>TerroirOS Trace</h1>
      <p>
        Open-source provenance and trust verification for high-value
        agricultural products.
      </p>
      <div className="card">
        <h2>MVP modules</h2>
        <ul>
          <li>Producer dashboard for batch and event creation.</li>
          <li>Public verification view with trust status badges.</li>
          <li>Signed attestation events with chain anchoring status.</li>
        </ul>
      </div>
      <div className="card">
        <h3>Quick links</h3>
        <p>
          Open <a href="/dashboard">dashboard</a> to manage sample batches.
        </p>
        <p>
          Verify a sample at <a href="/verify/demo-batch-001">/verify/demo-batch-001</a>.
        </p>
      </div>
    </main>
  );
}
