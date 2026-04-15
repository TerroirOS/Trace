# Batch Creation

`POST /batches` is now a create-only onboarding path for producer batch records.

It now enforces:

- DTO validation and field normalization for batch ID, producer ID, product fields, harvest date, and schema version
- producer existence checks before a batch can be created
- idempotent replays when the incoming batch payload exactly matches an existing batch
- conflict rejection when a `batchId` is reused with different creation details
- conflict rejection when a second batch tries to reuse the same producer/product/varietal/location/harvest-date fingerprint
- schema-version enforcement at both the API and database layers

The duplicate-prevention fingerprint is intentionally case-insensitive for product
type, varietal/subtype, and location so superficial casing changes do not create
parallel batch records for the same harvest lot.
