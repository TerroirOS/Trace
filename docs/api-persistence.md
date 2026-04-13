# API Persistence

Trace API writes its core domain records to Postgres whenever `DATABASE_URL` is set.
This keeps producer, issuer, batch, batch-event, chain-transaction, and auth
challenge state available after an API restart instead of relying on process-local
maps.

Current Day 7 persistence baseline:

- `producers`: canonical storage for producer onboarding records
- `issuers`: issuer identity, wallet, trust flag, and role assignments
- `batches`: producer-linked batch metadata
- `batch_events`: event payloads, document refs, signatures, and computed event hashes
- `chain_transactions`: queue/submission/confirmation state for on-chain anchoring
- `auth_challenges`: wallet login challenges issued by the API auth module

Operational notes:

- If `DATABASE_URL` is not configured, the API still falls back to in-memory maps for
  local development, but that mode is intentionally non-durable.
- The chain worker now reloads event and batch data from Postgres-backed services
  while processing queue items, so queued attestations survive service restarts as
  long as the database is available.
- Supabase schema artifacts must stay aligned with `apps/api/db/schema.sql` because
  the API assumes the same column contract in both local Postgres and Supabase.
