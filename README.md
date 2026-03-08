# TerroirOS Trace

Open digital trust infrastructure for agricultural provenance, starting with
Georgian wine.

## What this MVP includes

- `apps/api`: NestJS API for producers, batches, events, issuer attestations,
  verification, and chain queue status.
- `apps/web`: Next.js app with producer dashboard and public verification page.
- `packages/contracts`: Solidity contracts (`BatchRegistry`,
  `AttestationRegistry`) and Hardhat tests.
- `packages/schemas`: Versioned trace schemas and hash helpers.
- `docs/sample-data`: Pilot Georgian wine dataset.

## Quick start

1. Install dependencies:
   - `npm install`
2. Start local services:
   - `docker compose up -d`
3. Start API:
   - `npm run dev -w @terroiros/api`
4. Start Web:
   - `npm run dev -w @terroiros/web`

## Data policy

On-chain:

- event IDs
- hashes
- timestamps
- issuer signatures (or references to them)
- payout events (reserved for Shield)

Off-chain:

- documents
- photos
- certificates
- commercially sensitive metadata
- personal information

## Open-source

- License: MIT (`LICENSE`)
- Protocol: `docs/protocol.md`
- API: `docs/api.md`
- Contribution guide: `CONTRIBUTING.md`
