# API Restart Verification

Day 10 adds a repeatable smoke check for the DB-backed Trace API endpoints that
must survive process restarts.

Command:

- `npm.cmd run verify:db-restart`

What it does:

- runs `db:migrate` unless `--skip-migrate` is passed
- runs `db:seed` unless `--skip-seed` is passed
- runs `npm.cmd run build -w @terroiros/api` unless `--skip-build` is passed
- starts the API, snapshots the seeded list/detail endpoints, stops the API,
  starts it again, and verifies the same persisted snapshot comes back

Endpoints covered:

- `GET /producers`
- `GET /producers/:producerId`
- `GET /issuers`
- `GET /issuers/:issuerId`
- `GET /batches`
- `GET /batches/:batchId`
- `GET /events/batch/:batchId`
- `GET /events/:eventId`
- `GET /chain/transactions`
- `GET /verification/:batchId`

Environment requirements:

- `DATABASE_URL` must point at a reachable Postgres instance
- dependencies must be installed so `pg`, NestJS, and TypeScript builds are available
- the API listens on `HOST` and `PORT`; the verifier defaults to `127.0.0.1:4100`
  and can be overridden with `TRACE_VERIFY_HOST` / `TRACE_VERIFY_PORT`

Operational notes:

- The verifier uses the deterministic Georgian wine seed in
  `docs/sample-data/georgian-wine-demo.json` unless `TRACE_SEED_FILE` overrides
  it.
- `verifiedAt` is intentionally ignored when comparing snapshots across restarts
  because it is generated per request.
- If your database is already migrated/seeded or the API build is already
  current, pass `--skip-migrate`, `--skip-seed`, or `--skip-build` to shorten
  the run.
