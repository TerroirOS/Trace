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

1. Confirm the repo bootstrap baseline:
   - `npm.cmd run bootstrap:check`
2. Install dependencies:
   - `npm.cmd install`
3. Copy environment defaults:
   - `Copy-Item .env.example .env`
4. Start local services:
   - `docker compose up -d`
5. Start API:
   - `npm.cmd run dev -w @terroiros/api`
6. Start Web:
   - `npm.cmd run dev -w @terroiros/web`

## Bootstrap notes

- On Windows PowerShell, use `npm.cmd` instead of `npm` when script execution
  policy blocks `npm.ps1`.
- `npm run bootstrap:check` is dependency-free and validates the expected
  workspace files, lockfile, Node version, and core environment keys before
  install/build steps.

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
