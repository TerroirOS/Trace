# Producer Onboarding Hardening

Day 11 tightens `POST /producers` so producer creation is safer and idempotent.

Current onboarding guarantees:

- payloads are validated through an explicit DTO instead of accepting raw interface-shaped JSON
- `countryCode` is normalized to uppercase ISO-3166-1 alpha-2 values
- `organizationWallet` is normalized to lowercase and must be a valid EVM address
- `region` is optional, but blank strings are dropped instead of stored as empty values
- replaying the same producer onboarding payload is treated as idempotent
- reusing an existing `producerId` with different details is rejected
- assigning one wallet to multiple producers is rejected in both the API service and the database schema

Operational note:

- The database migration adds a case-insensitive unique index on producer organization
  wallets. Existing environments must not contain duplicate wallet assignments before
  applying the migration.
