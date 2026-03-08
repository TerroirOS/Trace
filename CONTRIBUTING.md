# Contributing to TerroirOS

## Development workflow

1. Fork and create a feature branch.
2. Keep changes scoped to one concern.
3. Add or update tests for behavior changes.
4. Open a pull request with a clear summary and test plan.

## Standards

- Preserve privacy-first data boundaries (sensitive data off-chain).
- Keep on-chain contracts minimal and auditable.
- Version schemas and avoid breaking changes without migration notes.
- Prefer explicit docs for protocol and API changes.

## Local setup

- `npm install`
- `docker compose up -d`
- `npm run dev -w @terroiros/api`
- `npm run dev -w @terroiros/web`

## Pull request checklist

- [ ] Tests pass (`npm run test`)
- [ ] Docs updated (`README`, `docs/protocol.md`, `docs/api.md` if needed)
- [ ] No secrets committed
- [ ] Contract changes include tests
