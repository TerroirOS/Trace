# Issuer Registration

`POST /issuers` is a create-only registration path for trusted trace issuers.

It now enforces:

- DTO validation and field normalization for issuer ID, organization name, wallet address, roles, and trust state
- idempotent replays when the incoming issuer registration exactly matches an existing issuer record
- conflict rejection when an issuer ID is reused with different wallet, role, trust, or organization details
- conflict rejection when a wallet address is already assigned to a different issuer
- persistent wallet uniqueness and non-empty role arrays at the database layer

Allowed issuer roles are:

- `ASSOCIATION`
- `CERTIFIER`
- `LOGISTICS_PARTNER`
- `WINERY_OPERATOR`

This endpoint no longer acts as a blind upsert for issuer role or trust changes. Any future trust-state or role-management flow should use a dedicated update path with explicit authorization and audit logging.
