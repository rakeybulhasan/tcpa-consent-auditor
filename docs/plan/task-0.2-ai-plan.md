# Task 0.2 — AI Execution Plan: Scaffold `apps/web` from Shopify CLI

This plan is written for AI agents. Run the steps in order. A step is finished only when its **Verify** check passes. Steps marked 🧑 **HUMAN** need a browser or an interactive login: stop and ask the user to run them with `! <command>`, then continue.

- **Sources:** [client guide](../runbooks/task-0.2-scaffold-apps-web.md) (background and reasons) and [implementation notes](task-0.2-implementation-notes.md) (why this plan departs from the guide). Where they disagree, this plan wins.
- **Goal:** `apps/web` becomes a real Shopify embedded app (React Router template, Polaris Web Components, App Bridge) that installs on a dev store and renders inside Admin.
- **Repo root:** `/var/www/html/own-projects/zaman-bhi/typescript/tcpa-consent-auditor`. All paths below are relative to it.
- **Scratch dir:** `/tmp/shopify-scaffold`, outside the repo on purpose.

## Hard constraints (never violate)

1. `apps/web/package.json` keeps `"name": "@tcpa-auditor/web"` and the three `workspace:*` deps (`@tcpa-auditor/db`, `@tcpa-auditor/rule-engine`, `@tcpa-auditor/integrations`). **Merge into it. Never overwrite it.**
2. `apps/web/tsconfig.json` keeps `"extends": "../../tsconfig.base.json"`. Never replace it with the template's standalone tsconfig. Strict mode and `noUncheckedIndexedAccess` must stay on.
3. `shopify.app.toml` keeps `access_scopes.scopes = ""` (FR-1.1 covers anchor identity and billing only). Adding any scope needs PM or Tech Lead sign-off.
4. Never commit `.env`, `prisma/dev.sqlite`, `.shopify/`, `build/` or `.react-router/`.
5. Don't run `shopify app init` inside the repo.
6. Don't commit or push unless the user asks.

## Steps

### 1. Baseline
```bash
pnpm install && pnpm turbo run lint typecheck build
```
**Verify:** exit 0. If it fails, stop and report. The baseline must be clean.

### 2. 🧑 HUMAN — Shopify CLI login
Ask the user to run `! shopify version` and `! shopify auth login`. If the CLI is missing, use `npm install -g @shopify/cli`.
**Verify:** `shopify version` prints a version.

### 3. Scaffold outside the repo
```bash
shopify app init --help   # confirm flag names first; they change between CLI releases
shopify app init --name=tcpa-consent-auditor-web --template=reactRouter \
  --path=/tmp/shopify-scaffold --package-manager=pnpm
```
`shopify app init` may create a nested folder. Set `$S` to the folder that contains `shopify.app.toml`.
**Verify:** `$S` contains `app/`, `shopify.app.toml`, `package.json`, `prisma/` and `vite.config.ts`. Note whether `shopify.web.toml`, `react-router.config.ts`, `.npmrc` and `public/` exist, because template contents change between releases. Step 5 copies whichever of them are present.

### 4. Confirm the UI stack
```bash
grep -rn "polaris" $S/app | head; grep -rn -i "app-bridge\|AppProvider" $S/app | head
grep -n "@shopify/polaris\"\|@shopify/app-bridge-react" $S/package.json
```
**Verify:** Polaris Web Components and App Bridge are both referenced, and `package.json` does **not** depend on the legacy `@shopify/polaris` React library. If it does, stop and tell the user, because the CLI or template is stale.

### 5. Copy source into `apps/web`
```bash
rm -rf apps/web/src apps/web/dist
cp -r $S/app apps/web/app
cp -r $S/prisma apps/web/prisma
cp $S/shopify.app.toml $S/vite.config.ts apps/web/
[ -d $S/public ] && cp -r $S/public apps/web/public
for f in shopify.web.toml react-router.config.ts env.d.ts .env.example .graphqlrc.ts; do [ -f $S/$f ] && cp $S/$f apps/web/; done
rm -f apps/web/prisma/dev.sqlite
```
**`.npmrc`:** if `$S/.npmrc` exists, don't copy it into `apps/web`, because pnpm reads `.npmrc` only at the workspace root. Show its settings to the user and merge them into a root `.npmrc` only if the user agrees.

**Verify:** `apps/web/src` and `apps/web/dist` are gone, and every copied path exists.

### 6. Merge `apps/web/package.json`
Edit the file. Don't overwrite it.
- Add `"type": "module"`.
- Add every `dependencies` and `devDependencies` entry from `$S/package.json`, using the scaffold's exact versions. It must include `@react-router/node`, `@react-router/serve`, `@react-router/dev`, `@shopify/shopify-app-react-router`, `@prisma/client`, `prisma`, `react`, `react-dom`, `react-router`, `isbot` and `vite`.
- Keep the three `workspace:*` deps, and keep `typescript` as a devDependency.
- Replace the scripts with:
```json
"scripts": {
  "dev": "shopify app dev",
  "setup": "prisma generate && prisma migrate deploy",
  "build": "prisma generate && react-router build",
  "start": "react-router-serve ./build/server/index.js",
  "lint": "eslint . --max-warnings 0",
  "typecheck": "prisma generate && react-router typegen && tsc --noEmit"
}
```
Also copy any other scripts the scaffold defines that `shopify.web.toml` refers to, such as `predev` or `docker-start`.
If `$S/package.json` has an `engines.node` range, check that Node 20 (`.nvmrc`) satisfies it. If it doesn't, stop and ask before changing `.nvmrc` or CI.

**Verify:** `name` is unchanged, the three workspace deps are present, and none of the old placeholder `echo` scripts remain.

### 7. Write `apps/web/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["@react-router/node", "vite/client"],
    "rootDirs": [".", "./.react-router/types"],
    "noEmit": true
  },
  "include": ["app", "env.d.ts", "vite.config.ts", "react-router.config.ts", ".react-router/types/**/*"]
}
```
Merge in any other `compilerOptions` from `$S/tsconfig.json` that the template's code needs, such as `paths`. Never drop `extends`.

**Verify:** this runs after Step 11's install, because `tsc` must come from `apps/web`'s installed dependencies. Run `pnpm --filter @tcpa-auditor/web exec tsc --showConfig` and check that it shows `"strict": true` and `"noUncheckedIndexedAccess": true`, and that `files` lists the `app/` sources.

### 8. Add `apps/web/turbo.json`
```json
{
  "extends": ["//"],
  "tasks": {
    "build": { "outputs": ["build/**"] }
  }
}
```
The client guide also lists `.react-router/**` as an output. That folder holds generated route types, which `typecheck` regenerates every time it runs, so it is left out here. Don't add a `dev` override, because the root `turbo.json` already sets one.

### 9. ESLint ignores (root `eslint.config.js`)
Add `"**/build/**"` and `"**/.react-router/**"` to the existing `ignores` array.

### 10. Root `.gitignore`
The root `.gitignore` uses repo-wide patterns rather than `apps/web/` paths: `build/`, `.react-router/`, `.shopify/`, `**/prisma/*.sqlite*`, plus env/secrets, test output, editor and OS files. Make sure those patterns are present. Never ignore `shopify.app*.toml` or `prisma/migrations/`, because both are committed.
**Verify:** `git status --short --ignored` lists `apps/web/build/`, `.react-router/` and any `dev.sqlite` as ignored (`!!`).

### 11. Install
```bash
pnpm install
```
**Verify:** exit 0, and `apps/web/node_modules/@tcpa-auditor/db` is a symlink.

### 12. Strip the over-scoped example
In `apps/web/app/routes/app._index.tsx`, remove the product-creation `action` and the GraphQL `productCreate`/`productVariantsBulkUpdate` example. Replace it with a minimal Polaris Web Components page, for example an `s-page` titled "TCPA Consent Auditor" with a placeholder `s-section`. Remove any template routes or links that only demo product APIs.
**Verify:** `grep -rn "productCreate\|write_products" apps/web/app` returns nothing.

### 13. Static gate
```bash
pnpm --filter @tcpa-auditor/web run typecheck
pnpm --filter @tcpa-auditor/web run lint
pnpm --filter @tcpa-auditor/web run build
```
Fix errors in the template code so it passes the strict base config (for example `noUncheckedIndexedAccess` guards). Don't loosen `tsconfig.base.json` or the ESLint rules. If a fix needs a rule change, stop and ask.
**Verify:** all three exit 0.

### 14. Workspace-link smoke test
Temporarily add `import "@tcpa-auditor/rule-engine";` to the top of `apps/web/app/root.tsx`, then run `pnpm --filter @tcpa-auditor/web run typecheck`. **Remove the import afterwards.**
**Verify:** no "cannot find module" error, and the import is removed.

### 15. Full pipeline (same command CI runs)
```bash
pnpm turbo run lint typecheck build && pnpm turbo run build
```
**Verify:** the first run exits 0. On the second build, `@tcpa-auditor/web` shows a cache hit, and `apps/web/build/` exists.

### 16. 🧑 HUMAN — Link app record
Ask the user to run `! cd apps/web && shopify app config link`.
**Verify:** `apps/web/shopify.app.toml` has a real `client_id`, `embedded = true` and `scopes = ""`. If the link step filled in scopes, reset them to `""`. Keep the `[webhooks] api_version` the scaffold generated (the client guide shows `2026-01`). The app should also appear in the org's Dev Dashboard. A local `apps/web/.env` is optional, because `shopify app dev` injects credentials. If one is needed, the user runs `! cd apps/web && shopify app env pull`, and it must never be committed.

### 17. 🧑 HUMAN — Dev store, install, render
Ask the user to run `! cd apps/web && shopify app dev` and then:
1. select or create a dev store,
2. press `P` and click **Install app**,
3. confirm the app opens at `admin.shopify.com/store/<store>/apps/<handle>` with the Admin nav visible, Polaris styling applied, and no console errors about framing, CSP or App Bridge.

**Verify:** the user confirms all three points. Then check that `git status` doesn't list `dev.sqlite`, `.shopify/`, `build/`, `.react-router/` or `.env`, and that it shows only intended changes: `apps/web/**`, `eslint.config.js`, `.gitignore`, `pnpm-lock.yaml` and docs.

### 18. Clean up and document
```bash
rm -rf /tmp/shopify-scaffold
```
- Delete `apps/web/README.md` if it was copied in.
- Run `/ci-check` as the final gate.
- Update `CLAUDE.md`. `apps/web` now builds with `react-router build` to `build/`, has its own `turbo.json`, uses `app/` instead of `src/`, and uses Prisma/SQLite only for Shopify sessions (not `packages/db`). Update the placeholder list and the commands too.
- Mark 0.2 ✅ and 0.3 ▶ in [`master-build-sequence.md`](master-build-sequence.md).

### 19. Commit (only if the user asks)
Suggested message: `feat(web): scaffold apps/web from shopify-app-react-router template`. After pushing, confirm CI is green.

## Done checklist
- [ ] App record linked, with a real `client_id`
- [ ] Installs on a dev store with no consent-screen errors
- [ ] Renders embedded inside Admin, with no frame, CSP or App Bridge errors
- [ ] Polaris UI styled
- [ ] Workspace import resolves (smoke test reverted)
- [ ] `pnpm turbo run lint typecheck build` passes
- [ ] No local state files tracked by git
- [ ] `CLAUDE.md` and the master sequence updated
- [ ] CI green (after the user commits and pushes)

## Troubleshooting quick map
| Symptom | Fix |
|---|---|
| `@tcpa-auditor/*` not found | The workspace deps were dropped from `apps/web/package.json`. Restore them and run `pnpm install`. |
| Auth or org error in `shopify app dev` | Have the user run `! shopify auth login` again. |
| Blank page, or a frame/CSP error | Check `embedded = true` and that App Bridge / `AppProvider` is still present (compare with `$S`). |
| Turbo caches empty output | Check where `react-router build` actually writes and set `apps/web/turbo.json` `outputs` to match. |
| Strict mode seems off in web | `extends` was lost from `apps/web/tsconfig.json`. Restore it. |
| `@prisma/client` types missing | Run `prisma generate` (it's part of the `typecheck` and `build` scripts). |
| Lint errors from `build/` or `.react-router/` | Step 9 ignores are missing. |
| No dev store to select | The user creates one in Partner Dashboard → Stores → Add store. |
