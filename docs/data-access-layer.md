# Data Access Layer

Day 8 introduces repository classes under `apps/api/src/modules/data` so the API's
domain services no longer embed table-specific SQL or row-mapping logic.

Current repository ownership:

- `producer.repository.ts`: producer writes, list queries, and row mapping
- `issuer.repository.ts`: issuer persistence, trust flag, and role JSON parsing
- `batch.repository.ts`: batch reads/writes and harvest-date normalization
- `batch-event.repository.ts`: batch-event persistence, event-hash lookups, and payload/doc parsing
- `chain-transaction.repository.ts`: chain queue persistence and transaction status lookups

Design notes:

- `DatabaseService` is the only shared Postgres connection owner in the data module.
- Each repository keeps a small in-memory cache so local fallback behavior remains
  available when `DATABASE_URL` is absent or a query fails.
- `StoreService` is now a thin facade used by higher-level modules while repository
  classes own SQL statements and row-to-schema conversion.
- The chain module now uses the same data-layer path as the rest of the API instead
  of maintaining a separate transaction-specific store service.
