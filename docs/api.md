# TerroirOS Trace API (MVP)

Base URL: `http://localhost:4000`

## Auth

- `POST /auth/challenge`
- `POST /auth/verify`

## Producers

- `POST /producers`
- `GET /producers`
- `GET /producers/:producerId`

`POST /producers` enforces:

- DTO validation and field normalization
- idempotent replays for matching producer records
- conflict rejection for producer ID or wallet ownership mismatches

## Issuers

- `POST /issuers`
- `GET /issuers`
- `GET /issuers/:issuerId`

`POST /issuers` enforces:

- DTO validation and field normalization
- idempotent replays for matching issuer registrations
- conflict rejection for issuer ID, wallet ownership, role, or trust mismatches

## Batches

- `POST /batches`
- `GET /batches`
- `GET /batches/:batchId`

`POST /batches` enforces:

- DTO validation and field normalization
- producer existence checks before batch creation
- idempotent replays for matching batch records
- conflict rejection for batch ID reuse or duplicate producer/harvest fingerprints
- schema-version validation against the current Trace batch contract

## Events

- `POST /events`
- `GET /events/:eventId`
- `GET /events/batch/:batchId`

`POST /events` enforces:

- schema validation
- role authorization by event type
- EIP-712 signature verification against issuer wallet
- queueing for chain anchoring

## Verification

- `GET /verification/:batchId`

Response includes:

- lifecycle completeness
- trusted issuer check
- signature validity summary
- hash consistency summary
- chain anchoring status (`PENDING`, `PARTIAL`, `COMPLETE`)

## Chain status

- `GET /chain/transactions`
