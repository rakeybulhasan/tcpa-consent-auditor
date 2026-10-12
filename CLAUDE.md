# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

TCPA Consent Auditor is a pnpm + Turborepo TypeScript monorepo that is still at the scaffold stage. `apps/web` is a real Shopify app shell (Task 0.2). Every other workspace's `src/index.ts` is a placeholder. Its comment names the plan task that will replace it (for example "Task 0.2", "Task 0.4", "Phase 3"). Keep those comments accurate when you implement a workspace.

The plan is saved in `docs/`:
- `docs/plan/master-build-sequence.md` lists all 65 tasks (0.1–6.13) with their status (✅ done, ▶ next). Update it when a task finishes.
- `docs/plan/task-X.Y-ai-plan.md` is the step-by-step execution plan for a task. Follow it when you implement that task. It takes precedence over the client guide.
- `docs/plan/task-X.Y-implementation-notes.md` explains where and why the plan departs from the client guide.
- `docs/runbooks/` holds verbatim copies of the client's per-task Complete Build Guides. Use them for background only.

The original client documents live outside this repo, in `../../TCPA/` (the product is also called "CartArmor" there):
- `requirements/CartArmor-Functional-Requirements-Document-v3.0.docx` holds the FR-numbered requirements, such as FR-3.
- `requirements/CartArmor-Master-Build-Sequence.docx` holds the Task/Phase numbering.
- `runbooks/` holds the per-task build guides, for example `Task 0.1 initialize monorepo complete build guide.md`.

## Commands

Use Node 22 (`.nvmrc`; the Shopify template needs >=22.12) and pnpm 9 (`packageManager` pins 9.12.0).

```bash
pnpm install
pnpm build        # turbo run build
pnpm lint         # turbo run lint (eslint --max-warnings 0, so warnings fail)
pnpm typecheck    # turbo run typecheck
pnpm dev          # turbo run dev --parallel (web runs `shopify app dev`; the others are placeholder echoes)
pnpm turbo run lint typecheck build   # exactly what CI runs

# Single workspace
pnpm turbo run build --filter=@tcpa-auditor/rule-engine
pnpm --filter @tcpa-auditor/web lint

# apps/web (Shopify)
cd apps/web && shopify app dev   # local dev against a dev store (needs `shopify auth login`)
pnpm --filter @tcpa-auditor/web run typecheck   # prisma generate + react-router typegen + tsc
```

The project skill `/ci-check` (`.claude/skills/ci-check/`) runs this CI gate and reports failures by workspace. Accepted arguments: `--force` or a workspace name.

`pnpm test` is wired in `turbo.json` (it depends on `build`), but no workspace defines a `test` script yet, so it does nothing. No test framework has been chosen.

## Architecture

- **apps/** are deployables:
  - `web`: Shopify embedded app.
  - `worker`: pg-boss scan-job consumer.
  - `admin`: "AI Lab Rule Administrator" console.
- **packages/** are shared libraries that `web` and `worker` consume as `workspace:*` dependencies:
  - `db`: Drizzle schema and client.
  - `rule-engine`: the Rule Engine and the ten FR-3 compliance checks.
  - `integrations`: a shared adapter interface plus Shopify, Klaviyo and Postscript adapters.
  - `admin` currently has no internal dependencies.
- **Packages resolve through their build output.** Each package's `main`/`types` point at `dist/`, not `src/`. That is why `lint`, `typecheck` and `build` all depend on `^build` in `turbo.json`. After you change a package's exports, rebuild it (or run through turbo) before typechecking a consumer. Running `tsc` directly in an app will see stale types.
- **Build:** each workspace compiles with plain `tsc` from `src/` to `dist/`, except `apps/web`. Every `tsconfig.json` extends `tsconfig.base.json`, which sets strict mode, `noUncheckedIndexedAccess`, `isolatedModules`, `moduleResolution: Bundler` and ESM output.
- **`apps/web` is different.** It is Shopify's React Router template (Polaris Web Components `<s-*>`, App Bridge via `AppProvider`). Its source is in `app/` with file-based routes in `app/routes/`, not `src/`. It builds with `react-router build` to `build/`, and its own `turbo.json` sets that output. Prisma (`prisma/`, SQLite `dev.sqlite`) stores **Shopify OAuth sessions only**. Product data belongs in `packages/db`. Its tsconfig adds DOM/JSX settings and `declaration: false`, because the base `declaration: true` is meant for library packages. The `<s-app-nav>` JSX types come from `@shopify/app-bridge-types`, which is a direct devDependency because the repo does not use the template's `shamefully-hoist`.
- **Shopify app config:** `apps/web/shopify.app.toml` keeps `scopes = ""`. FR-1.1 covers anchor identity and billing only, so adding a scope needs PM/Tech Lead sign-off. pnpm `overrides` (e.g. the template's `qs` pin) must go in the root `package.json`.
- **Lint:** ESLint uses one flat config at the repo root (`eslint.config.js`, typescript-eslint recommended; it ignores `dist/`, `build/` and `.react-router/`). Unused args are allowed only when prefixed with `_`. `no-explicit-any` is a warning, but `--max-warnings 0` makes it fail.

## Style

Prettier formats code: double quotes, semicolons, trailing commas, 100-character print width, 2-space indent. `.editorconfig` sets LF line endings and a final newline.
