import { getBatches } from "../../lib/api";

export default async function DashboardPage() {
  const batches = await getBatches();

  return (
    <main className="container">
      <h1>Producer Dashboard</h1>
      <p>
        Manage batch passports and share verifier links with importers and
        distributors.
      </p>

      <div className="card">
        <h2>Batch registry</h2>
        {batches.length === 0 ? (
          <p>No batches found yet. Start by creating a batch via API.</p>
        ) : (
          <ul>
            {batches.map((batch) => (
              <li key={batch.batchId}>
                <strong>{batch.batchId}</strong> - {batch.varietalOrSubtype} (
                {batch.productType}) -{" "}
                <a href={`/verify/${batch.batchId}`}>Verify link</a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Operator actions</h2>
        <ol>
          <li>Create producer and issuer records.</li>
          <li>Create batch with harvest and location details.</li>
          <li>Append signed lifecycle events for traceability.</li>
        </ol>
      </div>
    </main>
  );
}
