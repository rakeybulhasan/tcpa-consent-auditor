# Task 0.2 — Implementation Notes (our corrections to the client guide)

The client's guide is [`../runbooks/task-0.2-scaffold-apps-web.md`](../runbooks/task-0.2-scaffold-apps-web.md). Follow it, but apply the corrections below. Each one is a place where the guide as written conflicts with this repo's actual config.

**Acceptance criterion (unchanged):** the app installs on a Shopify dev store and renders inside Admin, the `@tcpa-auditor/*` workspace links still resolve, and `pnpm turbo run lint typecheck build` passes.

## Corrections

| Guide step | Issue | Correction |
|---|---|---|
| 2 | `shopify app init --package-manager=pnpm` installs dependencies in `_shopify-scaffold-tmp/`. That folder sits inside the pnpm workspace root, so the install can touch the root lockfile. | Scaffold outside the repo (e.g. `/tmp/shopify-scaffold`) and copy from there. |
| 5 | The copy list leaves out files the app needs. | Also copy `shopify.web.toml` (needed by `shopify app dev` for dev/predev and Prisma commands), `react-router.config.ts`, `public/`, and `env.d.ts` if present. Delete the stale `apps/web/dist/` as well. |
| 6–7 | The example `package.json` lacks `@react-router/node` and `@react-router/serve`. The `tsconfig` `types` entry and the `start` script need them. The scripts also drop the template's Prisma `setup` script. | Take the dependency list from the generated `package.json`. Keep a `setup` script (`prisma generate && prisma migrate deploy`). Make sure `prisma generate` runs before `typecheck` and `build`, including in CI. |
| 7 | `typecheck: tsc --noEmit` does not generate React Router's route types. | `"typecheck": "react-router typegen && tsc --noEmit"`. |
| 8 | `tsconfig.base.json` sets `lib: ["ES2022"]` with no DOM types and no `jsx` option, so the guide's tsconfig cannot typecheck React or `.tsx`. It also omits React Router's generated types. | Add `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, `"jsx": "react-jsx"`, `"rootDirs": [".", "./.react-router/types"]`, and add `.react-router/types/**/*` to `include`. Keep `extends` so strict mode and `noUncheckedIndexedAccess` still apply, and fix any template code that breaks under them. |
| 9 | The guide's `apps/web/turbo.json` lists `.react-router/**` as a build output. | Cache only `build/**`, because `.react-router/` holds generated route types that `typecheck` regenerates. No `dev` override is needed (the guide agrees). |
| 3 / 5 | Template contents vary between CLI releases (`shopify.web.toml`, `react-router.config.ts`, `.npmrc`, `public/`). | Copy whichever exist. Never copy `.npmrc` into `apps/web`, because pnpm reads it only at the workspace root. Merge its settings into the root only with the user's approval. |
| 6 | The template may declare an `engines.node` range that Node 20 (`.nvmrc`, CI) doesn't satisfy. | Check before installing. Ask before changing `.nvmrc` or CI. |
| 9 / lint | The root `eslint.config.js` ignores only `dist/`, `.turbo/` and `node_modules/`. After a build, `eslint .` in `apps/web` would lint `build/` and `.react-router/`, and `--max-warnings 0` fails on any warning. | Add `**/build/**` and `**/.react-router/**` to the root ESLint `ignores`. |
| 14 | `scopes = ""` is correct for FR-1.1 (anchor identity and billing only). But the template's example `app._index.tsx` creates products, which needs `write_products`. | Strip the product-creation example from `app._index.tsx` and replace it with a minimal Polaris page. Keep scopes empty. |
| 18 | The guide's `root.tsx` snippet is only illustrative. In the current template, App Bridge may be injected by `AppProvider` (`@shopify/shopify-app-react-router/react`) in `app/routes/app.tsx` rather than by a script tag in `root.tsx`. | Check the scaffold's actual files. Step 4's grep across `app/` covers both cases. |
| 19 | Runtime caveat for later tasks: the shared packages compile ESM output but their `package.json` files have no `"type": "module"`. | Typecheck passes for now. Revisit when `apps/web` first imports a package at runtime (Phase 1/2). |

## Manual steps (interactive — run by the developer)

- `shopify auth login` (Step 1)
- `shopify app config link`, which creates or links the app record in the Partner org (Step 13)
- `shopify app dev`: select or create a dev store, press `P`, click **Install app**, and confirm the app renders inside Admin (Steps 15–18)

## After the task

- Update `CLAUDE.md`. `apps/web` will no longer build to `dist/` with `tsc`. It builds with `react-router build` to `build/`, it has its own `turbo.json`, and it uses Prisma only for Shopify session storage, separate from `packages/db`.
- Mark Task 0.2 ✅ in [`master-build-sequence.md`](master-build-sequence.md).

## What actually happened (2026-10-07 run)

- **Shopify CLI 4.8.5:** `shopify app init` now creates the app record in the Partner org during scaffolding, so it needs a login first. Instead, the template came from Shopify's official repo (`Shopify/shopify-app-template-react-router`, commit `93348fe`, the same source as `--template=reactRouter`). The app record is created later with `shopify app config link`.
- **Node:** the template requires Node `>=22.12`. With the user's approval, `.nvmrc`, the root `engines` and CI moved to **Node 22**.
- **Template files used:** `app/`, `prisma/`, `public/`, `shopify.app.toml`, `vite.config.ts`, `env.d.ts` and `.graphqlrc.ts`. The template ships `shopify.web.toml.liquid`, which was rendered by hand for pnpm (`pnpm exec`). The template has no `react-router.config.ts` or `.env.example`.
- **Template files not used:** its ESLint 8 config and plugins (the repo has one ESLint 9 flat config), its `.npmrc` (`engine-strict`, `shamefully-hoist`), `extensions/` (empty), and its own `CLAUDE.md`, `AGENTS.md`, `.cursor`, `.gemini`, `.mcp.json`, `Dockerfile` and README.
- **`qs` override:** moved to the root `package.json` (`pnpm.overrides`), because pnpm ignores overrides set in workspace packages.
- **`<s-app-nav>` types:** without hoisting, `@shopify/app-bridge-types` wasn't visible to TypeScript. It was added as a pinned devDependency (0.7.2, the version `@shopify/app-bridge-react` uses) and to `types`.
- **`declaration: false` in `apps/web`:** the base `declaration: true` caused TS4023/TS2742 "cannot be named" errors on exported loaders. An app never emits declarations, so it was turned off for `apps/web` only. `strict` and `noUncheckedIndexedAccess` stay on, as `tsc --showConfig` confirms.
- **Lint:** two unused `eslint-disable` comments (`no-var`, `no-undef`) were removed from template files.
- **Demo code:** removed the product-creation demo (`app._index.tsx` now shows a placeholder page) and the `app.additional.tsx` route and its nav link. `scopes = ""`.
- **Results:** `pnpm turbo run lint typecheck build --force` passed 18/18, the `apps/web` build cache restores `build/`, and the workspace-import smoke test passed and was reverted.
- **App link:** linked to the Dev Dashboard app `tcpa-consent-auditor-web` (org `239556841`, client ID `2df7e953e9019e603768375b6803b039`) with `shopify app config link --client-id`. The template's `shopify.app.toml` lacks `name`, `application_url`, `embedded` and `[auth]`, so the link fails validation until those exist. The link rewrote the file and removed the template's commented-out GDPR compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`). **Task 1.7 / 6.12 must add these back.** They are mandatory for public App Store apps.
