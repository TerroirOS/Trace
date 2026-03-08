# TerroirOS Trace Protocol (MVP)

## Core entities

- Producer
- Batch
- Issuer
- BatchEvent
- VerificationResult

All event payloads include `schemaVersion` and use signed attestations.

## Event sequence

1. `BATCH_CREATED`
2. `HARVEST_RECORDED`
3. `PROCESSING_RECORDED`
4. `BOTTLING_RECORDED`
5. `SHIPMENT_RECORDED`
6. `THIRD_PARTY_VERIFIED` (optional per operator flow, recommended)

## Attestation model

Every `BatchEvent` includes:

- `eventId`
- `batchId`
- `eventType`
- `issuerId`
- `timestamp`
- `payload`
- `documentRefs`
- `prevEventHash` (optional)
- `signature` (EIP-712)

## On-chain footprint

For cost and privacy safety, contracts store only:

- batch root/meta hashes
- attestation hash
- issuer address
- block timestamp

## Role authorization matrix

- `BATCH_CREATED`: `WINERY_OPERATOR`, `ASSOCIATION`
- `HARVEST_RECORDED`: `WINERY_OPERATOR`
- `PROCESSING_RECORDED`: `WINERY_OPERATOR`
- `BOTTLING_RECORDED`: `WINERY_OPERATOR`
- `SHIPMENT_RECORDED`: `WINERY_OPERATOR`, `LOGISTICS_PARTNER`
- `THIRD_PARTY_VERIFIED`: `CERTIFIER`, `ASSOCIATION`

## Shield readiness hooks

Reserved fields and structures for module 2:

- `externalEvent` persistence table
- payout reference in event payload schema
- chain payout events in registry layer
