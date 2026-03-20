# Environment Contract

TerroirOS Trace uses a single root `.env` file for local development. The API,
web app, and contract workspace all read from that shared contract.

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill the required values for the services you want to run.
3. Keep secrets only in `.env` or your deployment secret manager.

## Variables

| Variable | Scope | Required | Default / example | Notes |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | API, web | no | `development` | Standard runtime mode. |
| `TRACE_API_URL` | web | yes for web -> API calls | `http://127.0.0.1:4000` | Base URL used by server actions and data fetches in `apps/web`. |
| `NEXT_PUBLIC_SITE_URL` | web | recommended | `http://127.0.0.1:3000` | Canonical site URL for auth callback and verification links. |
| `DATABASE_URL` | API | yes for persistent API state | `postgresql://terroiros:terroiros@localhost:5432/terroiros` | NestJS services read this to persist chain and trace data. |
| `JWT_SECRET` | API | yes for production | `replace-in-production` | Reserved for API auth/session signing. Rotate before any shared environment. |
| `NEXT_PUBLIC_SUPABASE_URL` | web | yes for Supabase-backed auth/data | none | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | yes for Supabase-backed auth/data | none | Browser-safe anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | web server actions | optional local, required for privileged writes | none | Used only on the server for superadmin writes that must bypass RLS. |
| `SUPERADMIN_EMAILS` | web | optional | none | Comma-separated allowlist for superadmin UI access. |
| `DEV_SUPERADMIN_BYPASS` | web | no | `false` | Local-only bypass switch. Must remain `false` outside isolated development. |
| `DEV_SUPERADMIN_BYPASS_TOKEN` | web | no | `dev-superadmin` | Cookie token for the local bypass flow. Change if you enable the bypass. |
| `NEXT_PUBLIC_DEV_SUPERADMIN_BYPASS` | web | no | `false` | Public flag used to surface bypass UI in development only. |
| `OBJECT_STORAGE_ENDPOINT` | future API storage integration | no | `http://127.0.0.1:9000` | Prepared for S3/MinIO evidence storage. Not enforced by current MVP runtime. |
| `OBJECT_STORAGE_BUCKET` | future API storage integration | no | `trace-evidence` | Evidence bucket/container name. |
| `OBJECT_STORAGE_ACCESS_KEY` | future API storage integration | no | `minioadmin` | Local MinIO-compatible credential. |
| `OBJECT_STORAGE_SECRET_KEY` | future API storage integration | no | `minioadmin` | Local MinIO-compatible secret. |
| `CHAIN_ID` | API, contracts | recommended | `80002` | Network ID for Polygon Amoy by default. |
| `CHAIN_RPC_URL` | API, contracts | yes for on-chain writes | `https://rpc-amoy.polygon.technology` | Primary RPC endpoint for anchor submission and Hardhat deploys. |
| `CHAIN_RPC_FALLBACK_URL` | API | optional | none | Secondary RPC endpoint for failover reads/writes. |
| `DEPLOYER_PRIVATE_KEY` | API, contracts | yes for on-chain writes or deploys | none | Private key for contract deploys and attestation submission. Never commit this. |
| `BATCH_REGISTRY_ADDRESS` | API | optional until batch anchoring is enabled | none | Deployed `BatchRegistry` address. |
| `ATTESTATION_REGISTRY_ADDRESS` | API | yes for live attestation anchoring | none | Deployed `AttestationRegistry` address. |

## Runtime combinations

### Web only

- `TRACE_API_URL`
- `NEXT_PUBLIC_SITE_URL`

Add the Supabase keys if you want login, protected routes, or database reads
through Supabase.

### API only

- `DATABASE_URL`

Add the chain variables if you want live on-chain attestation writes instead of
queueing locally.

### Full local stack

- `TRACE_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- optionally the wallet + chain variables when testing deployed contracts

## Notes

- `apps/api` loads the root `.env` through Nest `ConfigModule.forRoot()`.
- `packages/contracts` explicitly loads `../../.env`, so one shared root file is
  the intended contract.
- Older aliases such as `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `POLYGON_RPC_URL`, and `POLYGON_CHAIN_ID` are intentionally not part of the
  contract because current code does not read them.
