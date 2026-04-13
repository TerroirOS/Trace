# Local Migration And Demo Seed

Trace now includes a local Postgres bootstrap flow for the Day 9 development
baseline:

- `npm.cmd run db:migrate`: applies SQL files in `supabase/migrations` in order
  and records each applied filename/checksum in `schema_migrations`.
- `npm.cmd run db:seed`: loads the deterministic Georgian wine demo flow from
  `docs/sample-data/georgian-wine-demo.json`.
- `npm.cmd run db:setup`: runs migrations first, then seeds the local demo data.

Environment requirements:

- `DATABASE_URL` must point at the local/dev Postgres instance.
- `TRACE_SEED_FILE` is optional and can override the default seed JSON path
  relative to the repo root.

Operational notes:

- Both scripts support `--dry-run` for validation without writing to the
  database.
- The seed process is deterministic for the demo IDs it owns: it deletes and
  recreates the matching demo producers, issuers, batches, events, documents,
  and chain transactions so repeated runs converge to the same state.
- Event hashes are recomputed during seed so `prev_event_hash` and `event_hash`
  stay aligned with the current payloads and document refs.

Default demo flow:

- One Kakheti producer: `producer-orkolani-001`
- Three issuers: winery ops, GI certifier, and logistics provider
- One batch: `demo-batch-001`
- Six lifecycle events: batch creation, harvest, processing, bottling,
  shipment, and third-party verification
- Six chain transaction records with mixed confirmed/submitted status for local
  verification UI and queue demos
