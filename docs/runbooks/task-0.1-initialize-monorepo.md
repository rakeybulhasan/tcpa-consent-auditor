# Task 0.1 — Initialize Monorepo: Complete Build Guide

**Phase 0 — Scaffolding | Week 1 | TCPA Consent Auditor — AI Lab, Product Incubator**

This is a standalone, linear, copy-paste-executable companion to the `Task 0.1` Excel runbook. It assumes nothing except an empty 
machine — every command and every file's complete content is given in the order you actually run/create them. Follow it top to bottom; 
there is no need to flip between sheets or tabs.

**What you'll have at the end:** a Git repository containing six workspace packages (`apps/web`, `apps/worker`, `apps/admin`, 
	`packages/db`, `packages/rule-engine`, `packages/integrations`), all wired together with pnpm workspaces and Turborepo, 
	all building and linting clean, with a green GitHub Actions run on both the initial commit and an empty follow-up commit.

**Estimated time:** 30–45 minutes for an experienced developer following this guide exactly.

---

## 0. Prerequisites

Confirm each of these before Step 1. If any command fails or is missing, install it first.

```bash
node --version        # must print v20.x.x or later (Node 20 LTS)
git --version         # any recent version
```

- **Node.js 20 LTS or later.** If missing, install via [nodejs.org](https://nodejs.org) or a version manager (`nvm install 20`).
- **Corepack** ships with Node 16.9+, so it's already present if `node --version` passed. It's what pins the exact pnpm version everyone 
	on the team (and CI) uses — you don't need to install pnpm separately.
- **Git**, plus an empty GitHub repository already created (do **not** initialize it with a README/.gitignore — this guide creates those). 
	You'll need its clone URL for Step 22.
- **A GitHub account/org with permission** to enable Actions on that repository — needed for Step 21's CI workflow to actually run.

Why this matters: a monorepo with mismatched package-manager or Node versions across developers is the single most common source of "works 
on my machine" bugs. Pinning both before writing a line of code (Steps 1–4) avoids that class of bug entirely, for the whole 12-week build.

---

## 1. Activate the exact toolchain

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm --version
```

**What it does:** Corepack is Node's built-in package-manager-version manager. `corepack enable` turns it on; 
	`corepack prepare pnpm@9.12.0 --activate` downloads and activates exactly pnpm 9.12.0 as the active `pnpm` command on this machine.

**Verify:** `pnpm --version` prints `9.12.0` exactly.

---

## 2. Create the repo and initialize Git

```bash
mkdir tcpa-consent-auditor && cd tcpa-consent-auditor
git init
git branch -M main
```

**What it does:** creates the root folder that will hold the entire monorepo and starts version control on it, with the default branch 
	explicitly named `main` (matching what the CI workflow in Step 21 triggers on).

**Verify:** `git status` shows `On branch main` and `No commits yet`.

From this point forward, every path given is relative to this `tcpa-consent-auditor/` root unless stated otherwise.

---

## 3–4. Root `package.json`, pinned to the exact pnpm version

```bash
pnpm init
```

This generates a minimal `package.json`. Now **replace its entire contents** with the following (this also completes Step 4 — pinning the 
	package manager — in the same file):

**File: `package.json`**
```json
{
  "name": "tcpa-consent-auditor",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "dev": "turbo run dev --parallel"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0",
    "eslint": "^9.9.0",
    "@eslint/js": "^9.9.0",
    "prettier": "^3.3.0",
    "typescript-eslint": "^8.5.0"
  }
}
```

> **Correction from the source runbook:** the original Step 9 install command (`pnpm add -D eslint@^9 prettier@^3 typescript-eslint -w`) 
	omits `@eslint/js`. The flat ESLint config built in Step 9 below uses `js.configs.recommended`, which comes from the separate `@eslint/js` 
	package — without it, `pnpm lint` fails at config-load time with a module-not-found error. It's included here and in Step 9's install 
	command so the guide is correct as written, not just as originally specified.

**What each part does:** `"packageManager"` locks the exact pnpm version — Corepack auto-switches to it on any machine or CI runner, with no 
	manual step. `"engines"` documents the required Node version (informational; doesn't itself enforce). The five `"scripts"` all delegate 
	to `turbo run <task>`, so one root-level command (e.g. `pnpm build`) runs that task across every package in the correct dependency 
	order. `devDependencies` lists the tools shared by the whole repo — individual packages don't re-declare these.

**Verify:** `package.json` exists at the repo root with `"private": true` and the `"packageManager"` field set.

---

## 5. Define the pnpm workspace

**File: `pnpm-workspace.yaml`**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

```bash
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF
```

**What it does:** tells pnpm that any folder directly under `apps/` or `packages/` is a workspace member. This is the exact mechanism that 
	later lets `apps/web` depend on `packages/rule-engine` via `"workspace:*"` (Step 17) instead of publishing to npm.

**Verify:** the file exists; once real packages exist (Step 18), `pnpm -r list` will list every app and package.

---

## 6. Install Turborepo as a root devDependency

```bash
pnpm add -D turbo@^2 -w
```

**What it does:** installs Turborepo — the tool that runs `build`/`lint`/`typecheck`/`test`/`dev` across every package in the correct 
	dependency order, caching results so unchanged packages are skipped on the next run. The `-w` flag targets the workspace root explicitly 
	(required once a `pnpm-workspace.yaml` exists).

**Verify:** `pnpm turbo --version` prints a version number (2.x).

---

## 7. Create the Turborepo task pipeline

**File: `turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
EOF
```

**What each part does:** `"build"`'s `"dependsOn": ["^build"]` means "build this package's dependencies first" (the caret means "upstream 
	workspace packages") — so `packages/db` always finishes building before `apps/web` starts. `"outputs": ["dist/**"]` tells Turborepo what 
	to cache between runs. `"dev"` is explicitly `cache: false, persistent: true` because a dev server never "finishes" and must never be 
	served from a stale cache.

**Verify:** `pnpm turbo run build --dry-run` prints a task graph with no errors (even with no packages yet, it should at least parse 
	cleanly — a real graph appears once packages exist in Step 18+).

---

## 8. Create the shared strict TypeScript base config

**File: `tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true
  }
}
```

```bash
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true
  }
}
EOF
```

**What each part does:** `"strict": true` turns on every TypeScript strict-mode flag at once — the tech-stack doc's non-negotiable 
	requirement for this codebase. `"noUncheckedIndexedAccess"` additionally catches "this array/object access might be `undefined`" bugs 
	that plain strict mode misses — genuinely valuable in a compliance rule engine, where a silent `undefined` could become a false 
	compliance pass. Every package's own `tsconfig.json` extends this file, so no package can quietly opt out.

**Verify:** the file exists at the repo root and contains `"strict": true`.

---

## 9. Root ESLint + Prettier config

```bash
pnpm add -D eslint@^9 prettier@^3 typescript-eslint @eslint/js -w
```

**File: `eslint.config.js`**
```js
// eslint.config.js (repo root) -- flat config, shared by every workspace package
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
```

```bash
cat > eslint.config.js << 'EOF'
// eslint.config.js (repo root) -- flat config, shared by every workspace package
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
EOF
```

**File: `.prettierrc`**
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
EOF
```

**What each part does:** a single flat `eslint.config.js` at the repo root, using `typescript-eslint`'s recommended rules, covers all six 
	packages — no package-level `.eslintrc` files needed or wanted. The `ignores` block keeps compiled output and caches out of linting 
	entirely. `.prettierrc` is a small, opinionated formatting baseline; feel free to adjust `printWidth`/`singleQuote` to team taste, but 
	keep it identical across all packages (there is only one copy, at the root).

**Why this matters:** consistent lint/format rules across all six packages mean code review time isn't spent debating style, and the 
	acceptance criterion "lints clean" has one unambiguous, repo-wide definition rather than six potentially-different ones.

**Verify:** `pnpm lint` runs with zero configuration errors, even before any app code exists (it will report "no files matched" per package 
	until Steps 11–16 create source files — that's expected at this point).

---

## 10. Repo hygiene files

**File: `.gitignore`**
```gitignore
node_modules/
dist/
.turbo/
.env
.env.*
!.env.example
.DS_Store
*.log
```

**File: `.editorconfig`**
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

**File: `.nvmrc`**
```
20
```

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.turbo/
.env
.env.*
!.env.example
.DS_Store
*.log
EOF

cat > .editorconfig << 'EOF'
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
EOF

echo "20" > .nvmrc
```

**What each part does:** `.gitignore` prevents build artifacts (`dist/`, `.turbo/`), OS files, and — critically — secret `.env` files from 
	ever being committed, while still allowing a committed `.env.example` template. `.editorconfig` keeps indentation/line-endings consistent 
	across editors regardless of each developer's personal settings. `.nvmrc` pins the Node version for `nvm`/`fnm` users the same way 
	Step 4 pinned the pnpm version.

**Why this matters:** an accidentally-committed `.env` file is exactly the kind of credential leak the FRD's data-handling requirements 
	are designed to prevent later in the build. Stopping it at the repo-hygiene level, on day one, before any real secret exists, is the 
	cheapest possible fix.

**Verify:** after any build, `git status` never shows `node_modules/`, `dist/`, `.turbo/`, or `.env` as untracked/trackable files.

---

## 11. Scaffold `apps/web` (skeleton only)

```bash
mkdir -p apps/web/src
```

**File: `apps/web/package.json`**
```json
{
  "name": "@tcpa-auditor/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "dev": "echo \"placeholder -- real Shopify app scaffold lands in Task 0.2\""
  },
  "dependencies": {
    "@tcpa-auditor/db": "workspace:*",
    "@tcpa-auditor/rule-engine": "workspace:*",
    "@tcpa-auditor/integrations": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**File: `apps/web/tsconfig.json`**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**File: `apps/web/src/index.ts`**
```typescript
// Placeholder entry point for @tcpa-auditor/web.
// Replaced by the real Shopify embedded-app scaffold in Task 0.2.
export const APP_NAME = "web" as const;
```

```bash
cat > apps/web/package.json << 'EOF'
{
  "name": "@tcpa-auditor/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "dev": "echo \"placeholder -- real Shopify app scaffold lands in Task 0.2\""
  },
  "dependencies": {
    "@tcpa-auditor/db": "workspace:*",
    "@tcpa-auditor/rule-engine": "workspace:*",
    "@tcpa-auditor/integrations": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > apps/web/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > apps/web/src/index.ts << 'EOF'
// Placeholder entry point for @tcpa-auditor/web.
// Replaced by the real Shopify embedded-app scaffold in Task 0.2.
export const APP_NAME = "web" as const;
EOF
```

**What it does:** creates the minimal folder and files for the Shopify embedded-app package — just enough to build, lint, and be recognized 
	as a workspace member. The real Shopify CLI scaffold (OAuth, App Bridge, Polaris) is Task 0.2, not this task. Note the 
	three `"workspace:*"` dependencies already declared here — that's Step 17's wiring, added now rather than as a separate later edit, 
	since it's the same file.

**Why this matters:** keeping this task scoped to "skeleton only" is deliberate — it means Task 0.2 runs the Shopify CLI generator into 
	an already-wired workspace, instead of fighting the monorepo tooling and the Shopify template at the same time.

**Verify:** `apps/web/package.json` has `"name": "@tcpa-auditor/web"`. (A real build/lint check happens once all six packages exist 
	and `pnpm install` has run — Step 18 onward.)

---

## 12. Scaffold `apps/worker` (skeleton only)

```bash
mkdir -p apps/worker/src
```

**File: `apps/worker/package.json`**
```json
{
  "name": "@tcpa-auditor/worker",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "dev": "echo \"placeholder -- real pg-boss scan-job consumer lands in Phase 3\""
  },
  "dependencies": {
    "@tcpa-auditor/db": "workspace:*",
    "@tcpa-auditor/rule-engine": "workspace:*",
    "@tcpa-auditor/integrations": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**File: `apps/worker/tsconfig.json`** — identical in shape to `apps/web/tsconfig.json` above (extends the root base 
	config, `outDir: dist`, `rootDir: src`).

**File: `apps/worker/src/index.ts`**
```typescript
// Placeholder entry point for @tcpa-auditor/worker.
// Replaced by the real pg-boss scan-job consumer in Phase 3.
export const APP_NAME = "worker" as const;
```

```bash
cat > apps/worker/package.json << 'EOF'
{
  "name": "@tcpa-auditor/worker",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "dev": "echo \"placeholder -- real pg-boss scan-job consumer lands in Phase 3\""
  },
  "dependencies": {
    "@tcpa-auditor/db": "workspace:*",
    "@tcpa-auditor/rule-engine": "workspace:*",
    "@tcpa-auditor/integrations": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > apps/worker/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > apps/worker/src/index.ts << 'EOF'
// Placeholder entry point for @tcpa-auditor/worker.
// Replaced by the real pg-boss scan-job consumer in Phase 3.
export const APP_NAME = "worker" as const;
EOF
```

**What it does:** creates the minimal package for the background scan-job processor (the pg-boss consumer, built out in Phase 3), with 
	the same three `workspace:*` dependencies as `apps/web`.

**Why this matters:** this exists now so `packages/rule-engine` and `packages/integrations` have **two** real consumers (web and worker) 
	importing them from day one — proving the shared-package architecture actually works before any real logic is written. Two independent 
	trigger paths (an on-demand scan from `apps/web`, a scheduled scan from `apps/worker`) running the exact same rule-engine code is a 
	correctness requirement, not just convenience — two different implementations of "is this within quiet hours" would be a real compliance risk.

**Verify:** same pattern as Step 11, once Step 18's install runs.

---

## 13. Scaffold `apps/admin` (skeleton only)

```bash
mkdir -p apps/admin/src
```

**File: `apps/admin/package.json`**
```json
{
  "name": "@tcpa-auditor/admin",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "dev": "echo \"placeholder -- real AI Lab Rule Administrator console lands in Task 5.1\""
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**File: `apps/admin/tsconfig.json`** — identical in shape to `apps/web/tsconfig.json`.

**File: `apps/admin/src/index.ts`**
```typescript
// Placeholder entry point for @tcpa-auditor/admin.
// Replaced by the real AI Lab Rule Administrator console in Task 5.1.
export const APP_NAME = "admin" as const;
```

```bash
cat > apps/admin/package.json << 'EOF'
{
  "name": "@tcpa-auditor/admin",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "dev": "echo \"placeholder -- real AI Lab Rule Administrator console lands in Task 5.1\""
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > apps/admin/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > apps/admin/src/index.ts << 'EOF'
// Placeholder entry point for @tcpa-auditor/admin.
// Replaced by the real AI Lab Rule Administrator console in Task 5.1.
export const APP_NAME = "admin" as const;
EOF
```

**What it does:** creates the minimal package for the internal AI Lab Rule Administrator console, built out in Phase 5.

> **Deliberate omission, matching the source runbook exactly:** unlike `apps/web` and `apps/worker`, `apps/admin` does **not** get the 
	three `workspace:*` dependencies wired in this task — the source runbook's Step 17 only names web and worker. Admin will almost 
	certainly need `packages/db` (at minimum) once Task 5.1 builds it for real, but adding a speculative, unused dependency now would 
	just produce an unused-import lint situation later with no benefit today. Wire it when Task 5.1 actually needs it.

**Why this matters:** scaffolding all three apps together now — even though `admin` isn't built until Phase 5 — means the workspace 
	structure never needs a disruptive restructure later. Every future task just fills in a folder that already exists and already builds.

**Verify:** same pattern as Step 11.

---

## 14. Scaffold `packages/db` (skeleton only)

```bash
mkdir -p packages/db/src
```

**File: `packages/db/package.json`**
```json
{
  "name": "@tcpa-auditor/db",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**File: `packages/db/tsconfig.json`** — identical in shape to the app-level tsconfig above.

**File: `packages/db/src/index.ts`**
```typescript
// Intentionally empty -- replaced by the real Drizzle schema + client in Task 0.4.
export {};
```

```bash
cat > packages/db/package.json << 'EOF'
{
  "name": "@tcpa-auditor/db",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > packages/db/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > packages/db/src/index.ts << 'EOF'
// Intentionally empty -- replaced by the real Drizzle schema + client in Task 0.4.
export {};
EOF
```

**What it does:** creates the package that will hold the Drizzle schema and generated client — filled in by Task 0.4, not this task. Note 
	this package's `package.json` has `"main"`/`"types"` fields (pointing at compiled output) that the app-level packages don't need, 
	since this one is meant to be *imported*, not run directly.

**Why this matters:** `apps/web` and `apps/worker` both depend on this package via `"workspace:*"` — it has to exist as a real, importable 
	package **before** Task 0.4 writes real schema code into it.

**Verify:** same pattern, once Step 18's install runs.

---

## 15. Scaffold `packages/rule-engine` (skeleton only)

```bash
mkdir -p packages/rule-engine/src
```

**File: `packages/rule-engine/package.json`**
```json
{
  "name": "@tcpa-auditor/rule-engine",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**File: `packages/rule-engine/tsconfig.json`** — identical in shape to `packages/db/tsconfig.json`.

**File: `packages/rule-engine/src/index.ts`**
```typescript
// Intentionally empty -- replaced by the Rule Engine and all ten FR-3 compliance checks across Phase 3.
export {};
```

```bash
cat > packages/rule-engine/package.json << 'EOF'
{
  "name": "@tcpa-auditor/rule-engine",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > packages/rule-engine/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > packages/rule-engine/src/index.ts << 'EOF'
// Intentionally empty -- replaced by the Rule Engine and all ten FR-3 compliance checks across Phase 3.
export {};
EOF
```

**What it does:** creates the package that will hold all ten compliance checks (FR-3.1–3.10), built out across Phase 3.

**Why this matters:** this is the exact package the tech-stack doc calls out as needing to be byte-for-byte identical 
	between `apps/web` (on-demand scans) and `apps/worker` (scheduled scans). Establishing it as a real workspace package — not a 
	copy-pasted folder — from the very first commit is what guarantees that identity going forward.

**Verify:** same pattern.

---

## 16. Scaffold `packages/integrations` (skeleton only)

```bash
mkdir -p packages/integrations/src
```

**File: `packages/integrations/package.json`**
```json
{
  "name": "@tcpa-auditor/integrations",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**File: `packages/integrations/tsconfig.json`** — identical in shape to `packages/db/tsconfig.json`.

**File: `packages/integrations/src/index.ts`**
```typescript
// Intentionally empty -- replaced by the shared adapter interface and Shopify/Klaviyo/Postscript adapters in Phase 2.
export {};
```

```bash
cat > packages/integrations/package.json << 'EOF'
{
  "name": "@tcpa-auditor/integrations",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > packages/integrations/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > packages/integrations/src/index.ts << 'EOF'
// Intentionally empty -- replaced by the shared adapter interface and Shopify/Klaviyo/Postscript adapters in Phase 2.
export {};
EOF
```

**What it does:** creates the package that will hold the Shopify/Klaviyo/Postscript adapters, built out in Phase 2.

**Why this matters:** same rationale as `db` and `rule-engine` — it exists as a real package now so Task 2.3's shared adapter interface 
	has somewhere real to live, rather than being bolted on afterward.

**Verify:** same pattern.

---

## 17. Confirm internal workspace dependencies are wired

If you followed Steps 11 and 12 exactly as written above, this step is **already done** — `apps/web/package.json` and `apps/worker/package.json` 
both already declare:

```json
"dependencies": {
  "@tcpa-auditor/db": "workspace:*",
  "@tcpa-auditor/rule-engine": "workspace:*",
  "@tcpa-auditor/integrations": "workspace:*"
}
```

**What it does:** declares that `apps/web` and `apps/worker` depend on the three shared packages, resolved locally via pnpm's workspace 
	protocol rather than a version number pointing at the npm registry.

**Why this matters:** this is the literal mechanism — not just an architectural intention — behind "the exact same rule-engine logic 
	runs regardless of trigger path." It's a real, type-checked package dependency, not a relative-path import that could quietly diverge over time.

**Verify (after Step 18's install):**
```bash
pnpm -r list --depth -1
```
This should show the dependency edges from `web`/`worker` to `db`/`rule-engine`/`integrations`.

---

## 18. Run the first full install

```bash
pnpm install
```

**What it does:** installs every dependency across every package and creates the symlinks that make `"workspace:*"` references resolve to 
	the local folders instead of the npm registry.

**Why this matters:** this is the step that actually *activates* everything configured in Steps 5–17 — nothing before this point is a "live" 
working install.

**Verify:**
```bash
ls pnpm-lock.yaml                              # should exist now, at the repo root
ls -la apps/web/node_modules/@tcpa-auditor/db  # should be a symlink into packages/db
```

---

## 19. Confirm root convenience scripts

Already present from Step 3–4's `package.json`:

```json
"scripts": {
  "build": "turbo run build",
  "lint": "turbo run lint",
  "typecheck": "turbo run typecheck",
  "test": "turbo run test",
  "dev": "turbo run dev --parallel"
}
```

**What it does:** gives every developer one command per action (`pnpm build`, `pnpm lint`, etc.) regardless of which of the six packages 
	they're actually touching.

**Why this matters:** this is what makes the acceptance criterion "repo builds and lints clean" a single command from the repo root, rather 
	than "cd into six folders and remember the right order."

**Verify:** `pnpm run` (no arguments) lists all five scripts.

---

## 20. First local verification

```bash
pnpm build
pnpm lint
```

**What it does:** runs Turborepo's build and lint pipeline across all six skeleton packages for the first time, end to end.

**Why this matters:** this *is* the acceptance criterion, run locally, before CI exists at all — catching a configuration mistake here 
	is far cheaper than debugging a red GitHub Actions run later.

**Verify:**
```bash
pnpm build   # exits 0; Turborepo summary shows 6/6 packages successful
pnpm build   # run again immediately -- every package should now show "cache hit"
pnpm lint    # exits 0; 0 errors, 0 warnings
```
If the second `pnpm build` doesn't show cache hits for all six packages, see the Troubleshooting appendix (Turborepo caching row) before 
continuing.

---

## 21. Create the CI workflow

```bash
mkdir -p .github/workflows
```

**File: `.github/workflows/ci.yml`**
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck build
```

```bash
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck build
EOF
```

**What it does:** defines a GitHub Actions job that runs on every pull request and every push to `main`: check out the repo, activate 
	pnpm/Node via Corepack (`pnpm/action-setup` + `actions/setup-node` with `cache: "pnpm"` for fast, reproducible installs), install 
	with `pnpm install --frozen-lockfile` (fails the build if the lockfile is out of sync with `package.json`), then run the exact 
	same `lint typecheck build` pipeline a developer runs locally.

**Why this matters:** this is literally the second half of the acceptance criterion — "CI green on an empty commit" — the workflow has to 
	exist and be correctly configured before that can ever be true. (Full CI hardening — separate staging/e2e jobs — is a later task; this 
	is the minimal version needed to prove this task is actually done.)

**Verify:** the YAML is syntactically valid (no tab characters, consistent indentation); it will appear under the repository's **Actions** tab 
	once pushed in Step 22.

---

## 22. Commit and push the skeleton

```bash
git add -A
git commit -m "chore: initialize pnpm + Turborepo monorepo skeleton"
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

Replace `<YOUR_REPO_URL>` with your actual GitHub repository's URL (e.g. `git@github.com:your-org/tcpa-consent-auditor.git`).

**What it does:** puts the entire skeleton under version control and pushes it, triggering the CI workflow for the first time.

**Why this matters:** nothing before this point has been tested against real CI infrastructure — this is the first time the pipeline runs 
	somewhere other than your own laptop.

**Verify:** the push succeeds with no errors; a new workflow run appears under the repository's **Actions** tab within a few seconds.

---

## 23. Verify the CI run is green

Open your repository on GitHub → **Actions** tab → the run for the commit you just pushed.

**What it does:** confirms the install → lint → typecheck → build pipeline defined in Step 21 actually passes against the real skeleton, 
	on GitHub's infrastructure rather than your own machine.

**Why this matters:** a red run here means the configuration works "on my machine" but not in a clean environment — exactly the class of 
	bug Steps 1 and 18 were designed to prevent. Debug and fix before moving on to any other task in the Build Plan.

**Verify:** the Actions run for this commit shows a green checkmark on the `build` job.

---

## 24. Fresh-clone + empty-commit verification (the real acceptance test)

This is the literal, word-for-word acceptance criterion, run for real — not just trusted from Step 20's local result, which could be 
	hiding leftover local state (a global tool, a stray cached file, etc.).

**Part A — fresh clone, in a completely separate, brand-new directory:**
```bash
cd /tmp                                    # or any scratch location outside your working copy
git clone <YOUR_REPO_URL> tcpa-fresh-clone-test
cd tcpa-fresh-clone-test
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm lint
```

**Part B — empty commit, back in your normal working copy:**
```bash
cd /path/to/your/original/tcpa-consent-auditor
git commit --allow-empty -m "ci: verify pipeline on empty commit"
git push
```

**What it does:** Part A reproduces exactly what a brand-new developer's laptop (or a CI runner) does with zero prior local state. Part B 
	separately proves CI passes even with no code changes at all — ruling out any hidden dependency on leftover cache or state from the 
	first CI run.

**Verify:**
- Part A: both `pnpm build` and `pnpm lint` exit 0 with no errors, matching Step 20's original output.
- Part B: the new Actions run for the empty commit shows a green checkmark.

**Once both parts pass, Task 0.1 can be marked Done in the Build Plan.** Clean up the temporary clone (`rm -rf /tmp/tcpa-fresh-clone-test`) once 
	you're satisfied.

---

## Final Acceptance Criteria Checklist

Literal criterion: *"Repo builds and lints clean on a fresh clone; CI green on an empty commit."*

| # | Check | Command | Expected Result |
|---|---|---|---|
| 1 | Builds clean | `pnpm build` | Exit 0; 6/6 packages successful, 0 errors |
| 2 | Build caching works | `pnpm build` (run twice) | Second run shows cache hit for all 6 packages, completes in under 1 second |
| 3 | Lints clean | `pnpm lint` | Exit 0; 0 errors, 0 warnings across all packages |
| 4 | Type-checks clean | `pnpm typecheck` | Exit 0 across all packages |
| 5 | Fresh clone builds/lints clean | Step 24, Part A | All commands exit 0, matching your original working copy |
| 6 | CI green on the real skeleton commit | Step 23 | Green checkmark on the Actions run |
| 7 | CI green on an empty commit | Step 24, Part B | Green checkmark on the Actions run for the empty commit |
| 8 | Workspace wiring is real, not decorative | See below | A deliberate type error in a shared package breaks a dependent app's build |

**Check #8, in detail** (temporary — revert immediately after):
```bash
# Temporarily break packages/rule-engine on purpose:
echo 'const x: string = 123;' >> packages/rule-engine/src/index.ts

pnpm --filter @tcpa-auditor/web build
# Expected: this FAILS with a TypeScript error originating in packages/rule-engine.
# If it doesn't fail, the workspace:* dependency isn't actually being type-checked.

git checkout -- packages/rule-engine/src/index.ts   # revert before committing anything else
```

---

## Troubleshooting Appendix

| Symptom | Likely Cause | Fix |
|---|---|---|
| `pnpm install` fails with an engine/packageManager mismatch error. | The globally-installed pnpm version doesn't match `"packageManager"` in `package.json`, and Corepack isn't enabled. | Run `corepack enable` once per machine, then re-run the command. Corepack transparently downloads and uses the pinned version. |
| `workspace:*` dependency not found / `apps/web` can't import `@tcpa-auditor/db`. | `pnpm install` was run before `packages/db/package.json` existed, or `pnpm-workspace.yaml` has a typo in the glob pattern. | Confirm `pnpm-workspace.yaml` lists `"packages/*"` (not `"package/*"` or a missing entry), then re-run `pnpm install` from the repo root. |
| `pnpm build` succeeds locally but fails in CI with a different error. | `pnpm-lock.yaml` is out of date relative to `package.json` (a dependency was added without committing the updated lockfile). | Run `pnpm install` locally (not `--frozen-lockfile`) to regenerate the lockfile, then commit the updated `pnpm-lock.yaml`. |
| Turborepo reports no cache hit even on an unchanged second run. | The task's `"outputs"` in `turbo.json` doesn't match where the package's build script actually writes files, or the task is incorrectly marked `"cache": false`. | Confirm each package's `tsc` output actually lands in `dist/` (matching `turbo.json`'s `"outputs": ["dist/**"]`), and that no unrelated config disabled caching. |
| ESLint reports "no config found" in one package but not others. | A package-level directory is missing from the root `eslint.config.js` coverage, or a stray legacy `.eslintrc` was left in a subfolder. | Use the single flat `eslint.config.js` at the repo root covering all six packages; remove any per-package `.eslintrc` files unless a package genuinely needs an override. |
| `pnpm lint` fails immediately with a module-not-found error for `@eslint/js`. | `@eslint/js` wasn't installed — it's easy to miss since it's not bundled with the `eslint` package itself. | `pnpm add -D @eslint/js -w`, then re-run `pnpm lint`. (This guide's Step 9 already includes it in the install command.) |
| CI job fails at the `pnpm install --frozen-lockfile` step specifically, but works locally with plain `pnpm install`. | This is the intended, correct behavior when the lockfile is stale — see the lockfile-mismatch row above. It is not a CI bug. | Regenerate and commit `pnpm-lock.yaml` locally; never use `--frozen-lockfile` locally while actively adding dependencies. |
| TypeScript strict-mode errors appear in a package that was supposedly "just a skeleton." | The package's `tsconfig.json` doesn't correctly extend `../../tsconfig.base.json` (wrong relative path for its folder depth), so it's silently using TypeScript's default (non-strict) settings and a different, unrelated error surfaced instead. | Run `pnpm --filter <pkg> exec tsc --showConfig` to print the fully-resolved config and confirm `"strict": true` appears. Fix the `"extends"` path if it's missing. |
| Fresh-clone verification (Step 24) fails even though your original working copy passed. | An untracked file the build silently depended on (a manually-created folder, a locally-installed global tool) was never committed to git. | Diff `git status` in your original working copy against a truly fresh clone to spot anything untracked; commit anything the build genuinely needs, and remove any hidden dependency on global tooling. |

---

## Resulting Repo Tree (for a final sanity check)

```
tcpa-consent-auditor/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .prettierrc
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── worker/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── admin/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
└── packages/
    ├── db/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts
    ├── rule-engine/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts
    └── integrations/
        ├── package.json
        ├── tsconfig.json
        └── src/index.ts
```

Every one of these files' complete, real content is given above — nothing in this tree should be a surprise or need to be invented on the fly.
