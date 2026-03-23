# Monorepo Package Boundaries

Day 4 audit scope: `apps/api`, `apps/web`, `packages/contracts`,
`packages/schemas`, and `packages/sdk`.

## Intended ownership

- `apps/api`
  - Owns NestJS transport, persistence orchestration, verification workflows,
    and chain job coordination.
  - May depend on `@terroiros/schemas` for shared types/validation and
    `@terroiros/contracts` for contract ABI access.
  - Must not read sibling workspace files through relative paths.
- `apps/web`
  - Owns Next.js routes, UI state, and browser/server actions.
  - Should consume the API or `@terroiros/sdk` for shared client access instead
    of duplicating transport contracts indefinitely.
  - Must not reach into API internals or contract artifacts directly.
- `packages/contracts`
  - Owns Solidity sources, Hardhat config, deployments, and package-level ABI
    access.
  - Exposes contract integration data through package exports rather than
    requiring consumers to know artifact paths.
- `packages/schemas`
  - Owns shared domain types, Zod schemas, and stable hash helpers used across
    runtimes.
  - Must stay framework-agnostic and dependency-light.
- `packages/sdk`
  - Reserved for reusable API client, DTO/view-model adapters, and higher-level
    consumer helpers shared by web or external integrators.
  - Should depend on `@terroiros/schemas`, not on app internals.

## Current dependency edges

- `apps/api -> @terroiros/schemas`
- `apps/api -> @terroiros/contracts`
- `apps/web -> local web-only libs`
- `packages/sdk -> (currently empty placeholder package)`

## Audit findings

1. `apps/api` imported `@terroiros/schemas` without declaring it in
   [`apps/api/package.json`](C:/Users/i_matcharashvili/Desktop/Terroir%20code/Trace/apps/api/package.json).
   This is now declared explicitly.
2. `apps/api` loaded contract ABIs by probing multiple relative paths under
   `packages/contracts/artifacts/...`, which coupled runtime behavior to repo
   layout and execution cwd. This is now replaced by a package-owned export in
   `@terroiros/contracts/abis`.
3. `apps/web` currently defines its own REST view types and fetch helpers in
   [`apps/web/lib/api.ts`](C:/Users/i_matcharashvili/Desktop/Terroir%20code/Trace/apps/web/lib/api.ts)
   while `packages/sdk` is empty. This is acceptable short term, but it is the
   next boundary gap to close once API/storage behavior is stable.

## Immediate rules for upcoming work

- Shared domain validation belongs in `packages/schemas`.
- Reusable chain integration helpers belong in `packages/contracts`.
- API-only repositories/services stay in `apps/api`.
- Web should call API endpoints or future `packages/sdk` helpers, not copy API
  internals.
- New cross-workspace imports must be backed by declared workspace
  dependencies.
