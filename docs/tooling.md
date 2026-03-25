# Shared Tooling Baseline

This monorepo uses a small shared tooling baseline so every workspace follows
the same TypeScript, lint, and formatting rules without duplicating config.

## TypeScript

- `tsconfig.base.json`: common compiler defaults shared everywhere
- `tsconfig.node.json`: Node-oriented settings for API and contract tooling
- `tsconfig.package.json`: build-oriented defaults for publishable packages

Workspace usage:

- `apps/api`: extends `tsconfig.node.json`
- `apps/web`: extends `tsconfig.base.json` and layers on Next.js requirements
- `packages/contracts`: extends `tsconfig.node.json`
- `packages/schemas`, `packages/sdk`: extend `tsconfig.package.json`

## Linting

Linting is normalized at the script level:

- TypeScript workspaces use `tsc --noEmit` for deterministic structural checks.
- The Next.js app uses `next lint` with the local `.eslintrc.json`.
- Root `npm run lint` executes workspace lint scripts in a fixed order.

## Formatting

- Root `.prettierrc.json` defines the shared formatting rules.
- Root `.prettierignore` and `.eslintignore` exclude generated outputs across all
  workspaces.
- Workspaces expose `format` and `format:write` scripts so local and CI usage is
  consistent.
