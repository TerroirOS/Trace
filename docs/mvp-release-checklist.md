# TerroirOS Trace MVP Release Checklist

## Exit criteria

- [x] Signed attestations work end-to-end (`POST /events` verifies EIP-712 signatures).
- [x] Issuer role authorization is enforced by event type.
- [x] Contracts for batch and attestation registries are implemented.
- [x] Contract unit tests are present in `packages/contracts/test`.
- [x] Public verification page renders trust status and timeline.
- [x] API verification endpoint summarizes trust and chain status.
- [x] Pilot Georgian wine sample dataset is available.
- [x] E2E tests cover happy path and risk scenarios.
- [x] Open-source docs (protocol, API, contributing, license) are included.

## Release notes preflight

- [ ] Run `npm install`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Start stack with `docker compose up -d` and smoke test web + API.
- [ ] Deploy contracts to Amoy and set environment addresses.

## Shield extension points reserved now

- `batch_events.payout_reference` for payout reconciliation references.
- `external_events` table for weather/oracle/crop-shock inputs.
- schema-level optional `payoutReference` in `BatchEvent`.
