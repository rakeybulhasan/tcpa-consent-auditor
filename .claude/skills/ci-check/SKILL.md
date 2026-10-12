---
name: ci-check
description: Run this repo's CI gate locally (turbo lint + typecheck + build, plus an advisory Prettier check on source) and report failures by workspace and file. Use before committing, after finishing a task step, or when asked "does CI pass?", "run the checks", or "/ci-check". Pass `--force` to bypass the Turborepo cache, or a workspace name (e.g. `web`) to check one workspace.
---

# CI Check

Run locally the same checks GitHub Actions runs (`.github/workflows/ci.yml`), then report the results. This skill is **report-only**: do not edit files to fix failures unless the user asks.

## Arguments

- none: the full repo, cached
- `--force`: the full repo with the Turborepo cache bypassed (use this when cached results may hide a problem, e.g. after changing `turbo.json` or config files)
- `<workspace>` (e.g. `web`, `rule-engine`): only that workspace and the packages it depends on, via `--filter=@tcpa-auditor/<workspace>...`

## Steps

1. **Environment check.** Run `node --version` (it must be 22.x per `.nvmrc`) and `pnpm --version` (9.x). If either doesn't match, report it at the top, because CI uses Node 22 and that may explain differences.

2. **Lockfile check.** CI runs `pnpm install --frozen-lockfile`. Run the same:
   ```bash
   pnpm install --frozen-lockfile
   ```
   If it fails, `pnpm-lock.yaml` is out of sync with a `package.json` and CI will fail at install. Report that and stop.

3. **The CI gate.** This is exactly what CI runs:
   ```bash
   pnpm turbo run lint typecheck build            # default
   pnpm turbo run lint typecheck build --force    # with --force
   pnpm turbo run lint typecheck build --filter=@tcpa-auditor/<workspace>...   # one workspace
   ```
   Use a timeout of at least 5 minutes. Turbo prefixes each line with `<package>:<task>:`. Use that prefix to find which workspace and task failed.

4. **Advisory format check (non-blocking).** CI does **not** run Prettier, and some committed root files (`package.json`, `eslint.config.js`, `pnpm-lock.yaml`, docs) are not Prettier-clean. So check only source code:
   ```bash
   pnpm exec prettier --check "apps/*/{src,app}/**/*.{ts,tsx}" "packages/*/src/**/*.{ts,tsx}"
   ```
   A "No files matching" error just means no files of that kind exist yet. Treat it as a pass.

## Report format

Start with one line: **CI gate: PASS** or **CI gate: FAIL**, plus the turbo summary (`Tasks: N successful, N total`, and how many came from cache).

If it failed, list each failing task in this form:
- `<package>` › `<task>`: `file:line`, then the error message (copy the first relevant compiler or ESLint line exactly, without paraphrasing)

Group repeated errors of the same kind. After the list, give a one-line likely cause for each, using the hints below. Then add the advisory Prettier result as a separate line, saying clearly that it does not affect CI.

## Repo-specific failure hints

- **A consumer typechecks against stale types** (e.g. a new export "does not exist" in `apps/*`): packages resolve through `dist/` (`main`/`types` point there). Turbo rebuilds dependencies via `^build`, but running `tsc` directly in an app does not. Rerun through turbo, or use `--force`.
- **Lint fails on a warning:** every workspace lints with `--max-warnings 0`, so a `no-explicit-any` warning fails the build. Unused arguments must be prefixed with `_`.
- **Errors from `noUncheckedIndexedAccess`** (`Object is possibly 'undefined'` on an array or record index) come from the strict base `tsconfig.base.json`. Don't suggest loosening the base config; suggest a guard.
- **`apps/web`, after Task 0.2:** if `@prisma/client` types are missing, `prisma generate` didn't run. If lint errors point into `build/` or `.react-router/`, those folders are missing from the root `eslint.config.js` `ignores`. If route `+types` are missing, `react-router typegen` didn't run. See `docs/plan/task-0.2-implementation-notes.md`.
- **The same command passes locally but fails in CI:** check whether the Node or pnpm versions differ, and check for files present locally but untracked (`git status --short`), since CI only sees committed files.
