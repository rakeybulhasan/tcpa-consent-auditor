# Task 0.2 — Scaffold apps/web from Shopify CLI: Complete Build Guide

**Phase 0 — Scaffolding | Week 1 | TCPA Consent Auditor — AI Lab, Product Incubator**

This is a standalone, linear, copy-paste-executable companion to the `Task 0.2` Excel runbook. It assumes Task 0.1 (Initialize Monorepo) is already done — `apps/web` exists as a placeholder workspace package with `pnpm build`/`pnpm lint` passing clean. Follow it top to bottom; no cross-referencing between sheets is required.

**What you'll have at the end:** `apps/web` replaced with a real Shopify embedded-app shell (OAuth install flow, session handling, App Bridge, Polaris Web Components), installed on a real Shopify development store and rendering inside Admin — while still keeping every workspace link Task 0.1 built (`@tcpa-auditor/web` importing `@tcpa-auditor/db`, `@tcpa-auditor/rule-engine`, `@tcpa-auditor/integrations`).

**Estimated time:** 45–75 minutes, including waiting on Shopify's interactive prompts and store creation.

---

## Analysis Notes (read before you start)

The source runbook this guide expands is well-built and internally consistent, with one small cross-sheet inconsistency worth flagging and resolving up front so you don't wonder about it mid-build:

- **The `apps/web/turbo.json` shown inline in the original Step 9 only overrides the `build` task's outputs.** The original Key Files & Snippets tab's fuller version of the same file *also* adds a `dev` task override (`cache: false, persistent: true`). That addition is harmless but redundant — Task 0.1's root `turbo.json` already marks `dev` as `cache: false, persistent: true` for every package, so a package-level override just repeats the same setting. **Step 9 below uses the minimal, build-only version** and explains why the `dev` override isn't needed.

Everything else across the six original sheets — the merged `package.json`, the tsconfig reconciliation, the `shopify.app.toml` scoping guidance, the acceptance-criteria breakdown, and the troubleshooting table — is consistent and carried forward faithfully below, just with full content inlined at every step instead of split across tabs.

**One standing caveat, carried forward from the source runbook's own "Sources Consulted" section, and worth repeating rather than dropping:** Shopify CLI's exact interactive prompts and flags change between releases. Before running Step 2's `shopify app init` command, run `shopify app init --help` once to confirm the flags below (`--name`, `--template`, `--path`, `--package-manager`) still match your installed CLI version, and cross-check the template alias against the live `shopify.dev` docs if it errors.

---

## 0. Prerequisites

- **Task 0.1 complete:** the monorepo exists, `apps/web` is a placeholder workspace package, and `pnpm build` / `pnpm lint` pass clean from the repo root.
- **A Shopify Partner organization** (also called the Dev Dashboard organization) that this app record will be created under.
- **Shopify CLI available** — install globally with `npm install -g @shopify/cli`, or run on demand via `npx shopify` / `pnpm dlx shopify`. This guide uses the global `shopify` form throughout for readability; substitute your preferred invocation consistently.
- **Node.js LTS**, pinned by Task 0.1's `.nvmrc` — the react-router template requires a current Node LTS release.
- **A web browser** you can log into Shopify with, for the interactive `shopify auth login` step and for clicking Install on the dev store.

---

## 1. Confirm Task 0.1 is done and log in to Shopify

```bash
# From the repo root:
pnpm build && pnpm lint

shopify version
shopify auth login
```

**What it does:** confirms the monorepo skeleton still builds and lints clean before you start, then authenticates the CLI against your Shopify Partner / Dev Dashboard account (opens a browser to log in and select an organization).

**Why this matters:** starting this task on a known-good baseline means any failure later is caused by *this* task, not a leftover issue from Task 0.1. Logging in up front avoids being interrupted mid-scaffold by an auth prompt.

**Verify:** both `pnpm build`/`pnpm lint` exit 0. `shopify auth login` completes and `shopify version` prints a version number with no auth warning.

---

## 2. Scaffold the template into a throwaway scratch folder — NOT directly into apps/web

```bash
# From the repo root:
shopify app init \
  --name=tcpa-consent-auditor-web \
  --template=reactRouter \
  --path=./_shopify-scaffold-tmp \
  --package-manager=pnpm
```

> Run `shopify app init --help` first if it's been a while since you last used the CLI — flag names and the exact template alias can change between releases (see Analysis Notes above).

**What it does:** generates a brand-new, complete Shopify app project (using the official `reactRouter` template alias) into a separate, disposable folder at the repo root.

**Why this matters:** `shopify app init` is designed to create a fresh standalone project — it is **not** workspace-aware and will happily overwrite Task 0.1's `package.json`, `tsconfig.json`, and the `workspace:*` dependency wiring if pointed directly at `apps/web`. Scaffolding into a scratch folder first, then merging deliberately (Steps 5–9), is what protects that existing wiring.

**Verify:** `_shopify-scaffold-tmp/` exists at the repo root containing a full `app/`, `shopify.app.toml`, `package.json`, `prisma/`, and related files. The command exits 0.

---

## 3. Review what the CLI generated

```bash
ls -la _shopify-scaffold-tmp
cat _shopify-scaffold-tmp/package.json
```

**What it does:** inspects the generated project structure before touching anything in `apps/web`.

**Why this matters:** you need to know exactly what exists before merging — this step is where you build the mental map used in Steps 5–9.

**Verify:** you can identify: `app/` (React Router source, **not** `src/`), `shopify.app.toml`, `prisma/schema.prisma`, `vite.config.ts`, `package.json`, `.env.example`, and a README.

---

## 4. Confirm the generated app uses the current Polaris Web Components + App Bridge stack

```bash
grep -r "cdn.shopify.com/shopifycloud/polaris" _shopify-scaffold-tmp/app
grep -r "app-bridge" _shopify-scaffold-tmp/app
```

**What it does:** searches the generated root layout for the Polaris Web Components CDN reference and the App Bridge script tag, confirming the scaffold used the current (2026) UI stack rather than the older, deprecated `@shopify/polaris` React library.

**Why this matters:** the tech-stack doc calls this a "significant and recent shift worth building around correctly" — this step is the concrete proof-point that you got it, rather than an assumption. If either grep comes back empty, the CLI/template version is stale and needs updating before continuing (see Troubleshooting).

**Verify:** both greps return at least one match, confirming Polaris Web Components (CDN) and App Bridge (script tag) are present — not the legacy `@shopify/polaris` or `@shopify/app-bridge-react` packages.

---

## 5. Move the Shopify-specific source into apps/web, reconciling the folder convention

```bash
rm -rf apps/web/src                          # removes Task 0.1's generic src/ placeholder
cp -r _shopify-scaffold-tmp/app apps/web/app
cp _shopify-scaffold-tmp/shopify.app.toml apps/web/
cp _shopify-scaffold-tmp/vite.config.ts apps/web/
cp -r _shopify-scaffold-tmp/prisma apps/web/prisma
cp _shopify-scaffold-tmp/.env.example apps/web/
```

**What it does:** replaces Task 0.1's generic `src/` placeholder with React Router's real convention (an `app/` folder), and brings over the Shopify-specific config files the app actually needs to run.

**Why this matters:** React Router's file-based routing convention expects `app/routes/*`, not `src/` — keeping Task 0.1's `src/` folder around would just be dead weight that also confuses the tsconfig `include` path fixed in Step 8.

**Verify:** `apps/web/app/`, `apps/web/shopify.app.toml`, `apps/web/vite.config.ts`, `apps/web/prisma/`, and `apps/web/.env.example` all exist; `apps/web/src/` no longer exists.

---

## 6. Merge dependencies into the existing apps/web/package.json (do not overwrite it)

Open both `_shopify-scaffold-tmp/package.json` and `apps/web/package.json` side by side. Copy the template's `"dependencies"` (react, react-dom, react-router, `@shopify/shopify-app-react-router`, `@shopify/shopify-api`, isbot, etc.) and `"devDependencies"` (vite, `@react-router/dev`, prisma, etc.) into `apps/web/package.json`'s existing dependency blocks — **do not replace the file wholesale.**

**What it does:** adds every package the real Shopify app needs, while keeping `"name": "@tcpa-auditor/web"` and the three `"workspace:*"` dependencies on `@tcpa-auditor/db`, `@tcpa-auditor/rule-engine`, and `@tcpa-auditor/integrations` that Task 0.1 already wired in.

**Why this matters:** this is the single step most likely to be done wrong under time pressure — simply copying the template's whole `package.json` over `apps/web/package.json` silently deletes the workspace links, and nothing will fail loudly until Phase 2/3 tries to import from a shared package and can't find it.

**Verify:** `apps/web/package.json`'s `"dependencies"` contains **both** the three `@tcpa-auditor/*` workspace entries **and** the new Shopify/React Router packages. `"name"` is still `"@tcpa-auditor/web"`.

---

## 7. Replace the placeholder scripts with the real Shopify dev/build/start scripts

In `apps/web/package.json`'s `"scripts"`, replace Task 0.1's placeholder with:

```json
"scripts": {
  "dev": "shopify app dev",
  "build": "react-router build",
  "start": "react-router-serve ./build/server/index.js",
  "lint": "eslint . --max-warnings 0",
  "typecheck": "tsc --noEmit"
}
```

**What it does:** swaps Task 0.1's one-line placeholder echo for the scripts the real app needs — `shopify app dev` for local development against a dev store, and the React Router build/start scripts for production.

**Why this matters:** these are the scripts Turborepo's root `turbo.json` (Task 0.1) actually invokes per-package — without this, `pnpm dev`/`pnpm build` from the repo root would still just print the old placeholder text.

**Verify:** `pnpm --filter @tcpa-auditor/web run` lists `dev`/`build`/`start`/`lint`/`typecheck`, none of them the old placeholder.

**After Steps 6–7, here is the complete, merged `apps/web/package.json`** (version numbers are illustrative — use whatever your scaffold actually generated in Step 3):

```json
{
  "name": "@tcpa-auditor/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "shopify app dev",
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tcpa-auditor/db": "workspace:*",
    "@tcpa-auditor/rule-engine": "workspace:*",
    "@tcpa-auditor/integrations": "workspace:*",

    "@shopify/shopify-app-react-router": "^1.0.0",
    "@shopify/shopify-api": "^11.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router": "^7.0.0",
    "isbot": "^5.1.0",
    "@prisma/client": "^5.19.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "@react-router/dev": "^7.0.0",
    "prisma": "^5.19.0"
  }
}
```

---

## 8. Reconcile tsconfig.json — restore the shared strict base, keep the template's path settings

Edit `apps/web/tsconfig.json`: keep `"extends": "../../tsconfig.base.json"` from Task 0.1, but merge in the react-router template's required `"include"` paths (`app/**/*`, `vite.config.ts`) and any React Router-specific `"types"` entries (e.g. `"@react-router/node"`).

**Full resulting file:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "build",
    "types": ["@react-router/node", "vite/client"]
  },
  "include": ["app", "vite.config.ts"]
}
```

**What it does:** `"extends"` is unchanged from Task 0.1 — this is what keeps strict mode and every other repo-wide compiler option in force. `"include"` now points at `app/` (React Router's convention) instead of `src/`, and `"types"` adds the React-Router-specific ambient types the template's own code needs to typecheck.

**Why this matters:** the template's own generated `tsconfig.json` is a full standalone config, not one that extends the monorepo's shared strict base — applying it as-is would silently drop `"noUncheckedIndexedAccess"` and the other strict settings Task 0.1 established for the whole repo. TypeScript strict mode has to apply uniformly across every package per the tech-stack doc's explicit requirement — `apps/web` quietly reverting to default (non-strict) settings here would be a correctness regression nobody notices until a bug ships.

> Note: `"outDir": "build"` is set here mainly for tooling/IDE consistency — the actual production build is driven by `react-router build` (Step 7), not a direct `tsc` compile, so `outDir` isn't load-bearing the way it was for Task 0.1's plain `tsc`-built skeleton packages. `typecheck` still runs `tsc --noEmit`, which does respect `"include"`/`"types"`.

**Verify:** `pnpm --filter @tcpa-auditor/web exec tsc --showConfig` shows `"strict": true` and the other `tsconfig.base.json` options, plus the `app/` paths resolving correctly.

---

## 9. Add a package-level turbo.json override for apps/web's real build output

```bash
cat > apps/web/turbo.json << 'EOF'
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": ["build/**", ".react-router/**"]
    }
  }
}
EOF
```

**What it does:** Turborepo 2's Package Configuration feature lets one specific package override just its own task settings. Here it tells Turborepo that `apps/web`'s build actually lands in `build/` and `.react-router/` — not `dist/`, which is what the root `turbo.json` assumed for the generic `packages/*` skeletons in Task 0.1.

**Why this matters:** without this override, Turborepo would cache the wrong (empty) output directory for `apps/web`, meaning cache hits would silently restore nothing and every `pnpm build` would look successful while producing stale or missing output.

> **Reconciling a source-document inconsistency:** the version above is intentionally minimal — build-outputs only. A `"dev"` task override (`cache: false, persistent: true`) is *not* included here, because Task 0.1's root `turbo.json` already applies exactly that setting to every package, `apps/web` included. Adding it again at the package level would just duplicate an inherited setting with zero behavioral difference — harmless if you do add it, but unnecessary.

**Verify:** `pnpm build` from the repo root, run twice in a row, shows a real cache HIT on the second run for `@tcpa-auditor/web` specifically (not just a false-positive empty cache).

---

## 10. Clean up the scratch folder and the now-redundant template files

```bash
rm -rf _shopify-scaffold-tmp
rm -f apps/web/README.md   # template's own generic README, if it conflicts with repo conventions
```

**What it does:** removes the temporary scaffold folder now that everything needed has been deliberately merged into `apps/web`.

**Why this matters:** keeps the repo root clean — leaving a second, parallel copy of the app around is a guaranteed source of someone editing the wrong copy later.

**Verify:** `_shopify-scaffold-tmp` no longer exists anywhere in the repo; `git status` shows only the intended new/changed files under `apps/web/`.

---

## 11. Update the monorepo .gitignore for Shopify- and Prisma-specific artifacts

Add to the **root** `.gitignore` (append, don't replace — Task 0.1's original entries stay):

```gitignore
# --- Added in Task 0.2 ---
apps/web/build/
apps/web/.react-router/
apps/web/prisma/dev.sqlite
apps/web/.shopify/
```

```bash
cat >> .gitignore << 'EOF'

# --- Added in Task 0.2 ---
apps/web/build/
apps/web/.react-router/
apps/web/prisma/dev.sqlite
apps/web/.shopify/
EOF
```

**What it does:** extends Task 0.1's `.gitignore` to also exclude the Shopify CLI's local cache folder, the React Router build output, and the local SQLite file the template uses for session storage.

**Why this matters:** the template's SQLite session-storage file and the CLI's local `.shopify/` cache both contain machine-specific, regenerable state — committing them causes merge conflicts and, in the SQLite file's case, could leak local session tokens.

**Verify:** after running the app locally (Step 16), `git status` does not show `build/`, `.react-router/`, `dev.sqlite`, or `.shopify/` as untracked or changed.

---

## 12. Install dependencies at the workspace root

```bash
# From the repo root:
pnpm install
```

**What it does:** resolves and installs every newly-added Shopify/React Router dependency, while re-linking the `workspace:*` symlinks to `packages/db`, `packages/rule-engine`, and `packages/integrations`.

**Why this matters:** this is the step that makes the merged `package.json` from Steps 6–7 actually real — nothing before this point has real `node_modules` for the new dependencies.

**Verify:** install completes with 0 errors; `apps/web/node_modules/@tcpa-auditor/db` still exists as a symlink (the workspace link survived the merge).

---

## 13. Link the local project to an app record in the Dev Dashboard

```bash
cd apps/web
shopify app config link
```

**What it does:** either creates a new app record under your organization or links to an existing one, then writes the resulting `client_id` and configuration into `apps/web/shopify.app.toml`.

**Why this matters:** an app must exist as a record in Shopify's Dev Dashboard before it can be installed anywhere — this step is what actually registers it, separate from having generated the local code.

**Verify:** `shopify.app.toml` now contains a real `"client_id"` (not a placeholder), and the app appears listed under your organization in the Dev Dashboard / Partner Dashboard.

---

## 14. Review and scope shopify.app.toml

Open `apps/web/shopify.app.toml` — confirm `name`, `application_url`, `embedded = true`, and the `access_scopes` list.

**Full file, as populated by Step 13 plus your own scope review:**

```toml
name = "tcpa-consent-auditor-web"
client_id = "<populated automatically by `shopify app config link`, Step 13>"
application_url = "<populated automatically -- your dev tunnel or production URL>"
embedded = true

[access_scopes]
# Minimum scopes for v1's anchor-identity + billing role (FR-1.1) -- review with
# PM/Tech Lead before Task 1.7's App Store submission checklist. Do not add
# product/customer data scopes this app doesn't actually use.
scopes = ""

[auth]
redirect_urls = [
  "<populated automatically>"
]

[webhooks]
api_version = "2026-01"
```

**What it does:** reviews the generated configuration file that controls how the app identifies itself to Shopify, whether it runs embedded in Admin, and what Admin API permissions it requests.

**Why this matters:** per FR-1.1, this app's job is anchor identity + billing only — it should request the minimum scopes needed for that, not broad product/customer data access it doesn't use. Over-scoping here is exactly the kind of thing Shopify App Store review (Task 1.7) will flag later.

**Verify:** `"embedded"` is `true`; `"access_scopes"` lists only scopes this app genuinely needs at this stage — flag anything broader for PM/Tech Lead sign-off before Task 1.7's App Store review checklist.

---

## 15. Select or create a development store

```bash
# From apps/web -- first run:
shopify app dev
```

If your organization's policy requires pre-approved stores, create one manually first instead:

**Partner Dashboard → Stores → Add store → Create development store → fill in Store Name / Country / Data configuration → Create development store**

**What it does:** `shopify app dev` prompts you to select a development store to preview against, and auto-selects it if you only have one; the CLI itself can also create a fresh dev store for you if none exists. The Partner Dashboard path is the manual fallback if your organization's policy requires pre-approved stores.

**Why this matters:** the app has to be tested against a real (development) Shopify store — this is the store where FR-1.1's OAuth install flow and Admin embedding actually get exercised for the first time.

**Verify:** a development store is selected or created; the CLI proceeds to the next step (building and starting the local preview) without an error about missing store access.

---

## 16. Run the app locally against the dev store

```bash
# From apps/web:
shopify app dev

# -- or, from the repo root, once Step 7's script is in place:
pnpm --filter @tcpa-auditor/web dev
```

**What it does:** builds the React Router app, starts a local dev server, opens a secure tunnel so Shopify can reach your machine, and serves GraphiQL for the Admin API using this app's own credentials.

**Why this matters:** this is the live, end-to-end proof that everything merged in Steps 5–9 actually works together — `package.json`, `tsconfig`, the `shopify.app.toml` scopes, and the workspace dependencies, all running as one real process.

**Verify:** terminal shows the app running, a preview URL, and a prompt/instruction to press `P` to open it. No build or config errors are printed.

---

## 17. Open the app and install it on the dev store

In the running `shopify app dev` terminal, press `P` (or open the printed preview URL directly). On the page that opens, click **Install app**.

**What it does:** opens the app's install/OAuth consent screen for the selected development store and completes the FR-1.1 install flow for the first time.

**Why this matters:** this is the literal first half of the acceptance criterion — "App installs on a Shopify dev store" — being exercised as a real user action, not just a passing test.

**Verify:** the browser shows Shopify's install/consent screen, listing the scopes from Step 14; clicking Install completes with no error and redirects into the app.

---

## 18. Verify the app renders embedded inside Shopify Admin

After install, confirm the app opens inside `https://admin.shopify.com/store/<your-dev-store>/apps/<app-handle>`, **not** as a standalone page.

**What it does:** confirms App Bridge successfully embedded the app inside the Shopify Admin iframe, and that Polaris Web Components rendered the page's navigation/UI chrome correctly.

**Why this matters:** this is the literal second half of the acceptance criterion — "renders inside Admin." An app that installs but opens as a bare, un-embedded page (or shows a blank/broken iframe) has **not** met this criterion, even though the install step succeeded.

**Verify:** the app's UI appears inside the normal Shopify Admin frame (with Shopify's own left-hand nav and top bar still visible around it); the browser console shows no App Bridge or CSP/frame-ancestors errors.

**Representative `apps/web/app/root.tsx` pattern** (illustrates what Step 4's grep is checking for — confirm against your own actual generated file, don't treat this as a literal dump):

```tsx
export const links = () => [
  { rel: "stylesheet", href: "https://cdn.shopify.com/shopifycloud/polaris.css" },
];

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <script src="https://cdn.shopify.com/shopifycloud/polaris.js" type="module"></script>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

---

## 19. Smoke-test that the workspace wiring survived the merge

```bash
# Temporarily add this import to apps/web/app/root.tsx:
# import '@tcpa-auditor/rule-engine';

pnpm --filter @tcpa-auditor/web run typecheck

# Confirm it resolves with no error, then REMOVE the import before continuing.
```

**What it does:** proves that after everything moved and merged in this task, `apps/web` can still import from the shared packages Task 0.1 wired up — the exact guarantee Task 0.1 Step 17 established.

**Why this matters:** it's possible to complete Steps 2–14 correctly and still have accidentally broken the workspace link (e.g., by pasting the template's `package.json` wholesale). This is the concrete proof that didn't happen, using the same pattern as Task 0.1's own final verification step.

**Verify:** the typecheck resolves the import with no "module not found" error. **Revert the import before committing** — this was a smoke test, not a real dependency yet.

---

## 20. Confirm the repo-wide build/lint/CI pipeline still passes with the real app in place

```bash
# From the repo root:
pnpm build && pnpm lint
```

**What it does:** runs Turborepo's full pipeline — now covering the real `apps/web` alongside the other five skeleton packages — one more time before committing.

**Why this matters:** Task 0.1's acceptance criterion ("repo builds and lints clean") was proven against skeletons; this step re-proves it now that `apps/web` contains real, much larger application code and new dependencies.

**Verify:** both commands exit 0 across all six packages, including the now-substantial `@tcpa-auditor/web`.

---

## 21. Commit, push, and confirm CI is still green

```bash
git add -A
git commit -m "feat: scaffold apps/web from shopify-app-react-router template"
git push
```

**What it does:** commits the real Shopify app scaffold and pushes it, triggering the CI workflow Task 0.1 set up.

**Why this matters:** Task 0.1's CI pipeline was only ever tested against empty skeletons — this is its first real test against actual application code and a meaningfully larger dependency tree.

**Verify:** GitHub Actions shows a green check for this commit. **Task 0.2 can now be marked Done**, and Task 0.3/0.4 (Postgres + `packages/db`) can begin.

---

## Final Acceptance Criteria Checklist

Literal criterion: *"App installs on a Shopify dev store and renders inside Admin."*

| # | Check | Command / Action | Expected Result |
|---|---|---|---|
| 1 | App record exists | `shopify app config link` (Step 13); check the org's app list in the Dev Dashboard | App appears listed with a real `client_id`, matching `apps/web/shopify.app.toml` |
| 2 | Development store selected | `shopify app dev` (Steps 15–16) | CLI reports a store is selected (auto-selected if only one exists) with no "no stores available" error |
| 3 | App installs | Press `P`, click **Install app** (Step 17) | Browser shows the Shopify consent screen listing the reviewed scopes; clicking Install redirects with no error |
| 4 | App renders inside Admin | Open the app from the dev store's Admin → Apps menu (Step 18) | URL is under `admin.shopify.com/store/<store>/apps/<handle>`; Shopify's own Admin nav/chrome is visible around the app's content |
| 5 | App Bridge loaded correctly | Open browser DevTools console while viewing the installed app | No "refused to display in a frame", CSP, or App Bridge initialization errors |
| 6 | Polaris Web Components rendered | Visual check of the installed app's rendered page | Page displays styled Polaris UI elements, not a broken/unstyled page |
| 7 | Workspace wiring intact | Step 19's temporary import + typecheck test | Typecheck resolves `@tcpa-auditor/rule-engine` with no "module not found" error; import removed before commit |
| 8 | Repo-wide build/lint still pass | `pnpm build && pnpm lint` (Step 20) | Both exit 0 across all six packages |
| 9 | CI green on this commit | Push (Step 21); check the Actions tab | Green checkmark on the workflow run for this commit |

---

## Troubleshooting Appendix

| Symptom | Likely Cause | Fix |
|---|---|---|
| After scaffolding, `apps/web` no longer resolves `@tcpa-auditor/db` or the other workspace packages. | The template's `package.json` was copied over `apps/web/package.json` wholesale instead of merged (Step 6 done as a copy, not a merge). | Restore the three `workspace:*` entries into `apps/web/package.json`'s dependencies, then re-run `pnpm install` from the repo root. |
| `shopify app dev` fails immediately with an authentication or organization error. | `shopify auth login` (Step 1) was skipped, or the CLI session expired. | Re-run `shopify auth login`, confirm the correct organization is selected, then retry `shopify app dev`. |
| The app installs but opens as a blank page, or the browser shows a frame/CSP error. | App Bridge script tag is missing or was accidentally removed from `app/root.tsx` during the merge in Step 5, or `"embedded"` is not set to `true` in `shopify.app.toml`. | Re-check Step 4's grep results and the `shopify.app.toml` `"embedded"` field; restore the App Bridge script tag from the original scaffold if it was lost during the file merge. |
| `pnpm build` reports `apps/web` output is empty even though the build appeared to succeed. | `apps/web/turbo.json` (Step 9) is missing, or its `"outputs"` path doesn't match where React Router actually writes its build (React Router version differences can change this). | Run the build directly with `pnpm --filter @tcpa-auditor/web run build` and check the actual output folder name; update `apps/web/turbo.json`'s `"outputs"` to match exactly. |
| TypeScript reports errors in `apps/web` that don't reference `tsconfig.base.json`'s strict settings, or strict mode seems "off". | `apps/web/tsconfig.json`'s `"extends"` path was overwritten by the template's own standalone tsconfig during the merge in Step 5/8. | Confirm `apps/web/tsconfig.json` still contains `"extends": "../../tsconfig.base.json"` — restore it if the template's file replaced it outright. |
| Step 4's Polaris/App Bridge grep returns no matches at all. | The installed Shopify CLI or template version is older than the one referenced in this guide and still generates the legacy `@shopify/polaris` + `@shopify/app-bridge-react` stack. | Run `shopify upgrade` (or reinstall the CLI) to the latest version, re-scaffold into a fresh scratch folder, and re-check; if the legacy stack is genuinely still current for your CLI version, flag this to the Tech Lead before proceeding — the tech-stack doc assumes Web Components. |
| A development store isn't available to select in `shopify app dev`. | The Shopify organization has no development stores yet, or your account lacks permission to create one. | Create one manually via Partner Dashboard → Stores → Add store → Create development store, or ask an org admin to grant store-creation permission. |
| `git status` shows `apps/web/prisma/dev.sqlite` or `apps/web/.shopify/` as untracked after running the app. | Step 11's `.gitignore` additions were skipped or the app was run before they were added. | Add the entries from Step 11 to the root `.gitignore`, then run `git rm --cached` on any of these files that were accidentally already tracked. |
| `apps/web/turbo.json`'s `"dev"` task setting seems to conflict or duplicate the root config. | You added a `"dev"` override (as the original source runbook's Key Files tab showed) in addition to the `"build"` override. | Not actually a bug — see the Analysis Notes and Step 9's note above. It's redundant, not conflicting; safe to leave in or remove. |

---

## Resulting apps/web Structure (Before vs. After)

| Path | Status After Task 0.2 | Purpose |
|---|---|---|
| `apps/web/package.json` | Modified (merged, not replaced) | Real Shopify/React Router deps **and** the original `workspace:*` deps |
| `apps/web/tsconfig.json` | Modified (merged, not replaced) | Still extends `../../tsconfig.base.json`; adds React Router include paths |
| `apps/web/turbo.json` | **New** | Package-level Turborepo override for the real build output directory |
| `apps/web/src/` | **REMOVED** | Task 0.1's generic placeholder source folder |
| `apps/web/src/index.ts` | **REMOVED** | Task 0.1's one-line placeholder export |
| `apps/web/app/` | **New** | React Router source root — routes, root layout, loaders/actions |
| `apps/web/app/root.tsx` | **New** | Root layout — loads Polaris Web Components (CDN) and the App Bridge script tag |
| `apps/web/app/routes/app._index.tsx` | **New** | Example authenticated route querying the Shopify Admin GraphQL API |
| `apps/web/app/routes/webhooks.tsx` | **New** | Example webhook receiver route |
| `apps/web/app/shopify.server.ts` | **New** | Core Shopify app configuration — auth, session storage, API version |
| `apps/web/shopify.app.toml` | **New** | App identity, scopes, and embedding configuration |
| `apps/web/vite.config.ts` | **New** | Vite build configuration for the React Router app |
| `apps/web/prisma/schema.prisma` | **New** | Schema for Shopify OAuth **session storage only** (SQLite by default) — **not** this product's business data model (that's `packages/db`, Task 0.4) |
| `apps/web/prisma/dev.sqlite` | New (gitignored) | Local session-storage database file — never commit |
| `apps/web/.env.example` | **New** | Documents required environment variables |
| `apps/web/.shopify/` | New (gitignored) | Shopify CLI's local cache/state folder |
| `_shopify-scaffold-tmp/` | **REMOVED** | Throwaway folder, deleted in Step 10 |

**`apps/web/.env.example`, in full:**
```
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=
SHOPIFY_APP_URL=
DATABASE_URL="file:dev.sqlite"
```
`SHOPIFY_API_KEY`/`SECRET` and `SCOPES` are populated by `shopify app config link` (Step 13) or `shopify app env pull`; `DATABASE_URL` points Prisma at the local session-storage SQLite file — unrelated to `packages/db`. Copy this to `apps/web/.env` locally; never commit the real `.env`.