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

## Batches

- `POST /batches`
- `GET /batches`
- `GET /batches/:batchId`

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
