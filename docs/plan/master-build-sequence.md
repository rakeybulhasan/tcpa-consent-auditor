# CartArmor — Master Build Sequence (V1)

Converted from the client's `CartArmor-Master-Build-Sequence.docx` (prepared by Khandaker, AI Lab, Product Incubator, 2026-10-01).

- **Governing spec:** `CartArmor-Functional-Requirements-Document-v3.0.docx`. The client calls it the single source of truth for every task.
- **Scope:** 65 tasks (0.1–6.13) that build and ship the v1 audit engine, including all ten TCPA compliance checks (FR-3.1–FR-3.10). FR-16–FR-24 are not covered yet (see the end of this file).
- **Order:** build in the order given. Each phase depends on the ones before it.
- **Per-task documents:** the `Complete-Build-Guide.md` is the main document, so read it in full before coding. The `Developer-Runbook-EXPANDED.xlsx` is a checklist to use alongside it. The plain (non-EXPANDED) `Developer-Runbook.xlsx` is superseded, so don't build from it. Guides received so far are saved in [`../runbooks/`](../runbooks/).

**Status** is tracked in this repo: ✅ done · ▶ next · 🧑 waiting on manual (browser) steps · blank = not started.

## Phase 0 — Foundation & Infrastructure

| Status | Task | Delivers |
|---|---|---|
| ✅ | 0.1 Initialize Monorepo | pnpm/Turborepo skeleton — [guide](../runbooks/task-0.1-initialize-monorepo.md) |
| ✅ | 0.2 Scaffold Apps Web | `apps/web` Shopify embedded-app shell — [guide](../runbooks/task-0.2-scaffold-apps-web.md), [our notes](task-0.2-implementation-notes.md) |
| ▶ | 0.3 Provision PostgreSQL | Managed Postgres + connection pooling |
| | 0.4 Build Packages DB | `packages/db` schema + ORM layer |
| | 0.5 Configure RLS | Postgres row-level security, the tenant-isolation floor (FR-15.4) |
| | 0.6 Configure GitHub Actions CI | lint/test/build/deploy pipelines |
| | 0.7 Secrets Management | Secrets manager for credential storage (FR-1.4) |
| | 0.8 Set Up Observability | Logging, monitoring, error tracking (NFR-9) |

## Phase 1 — Shopify Identity, Billing & Store-Readiness

| Status | Task | Delivers |
|---|---|---|
| | 1.1 Shopify OAuth Install Flow | Tenant anchor identity (FR-1.1) |
| | 1.2 Encrypt Credentials At Rest | Encrypted, never-logged credentials (FR-1.4) |
| | 1.3 Connection Health Check Job | Periodic integration health check (FR-1.5) |
| | 1.4 Shopify Billing API Skeleton & Trial | Subscription + 14-day trial (FR-11.2/11.3) |
| | 1.5 Tiered Pricing Logic & List Size | `TIER_PRICES` list-size tiering (FR-11.1) |
| | 1.6 Public Pricing Page | No-sales-call pricing page (FR-11.6) |
| | 1.7 Confirm App Store Review Requirements | Submission checklist, reused through 6.12 |

## Phase 2 — ESP Integration Adapters

| Status | Task | Delivers |
|---|---|---|
| | 2.1 Klaviyo API Spike — Consent Data | Explore Klaviyo's consent API |
| | 2.2 Postscript API Spike — Send-Timing Data | Explore Postscript's send-timing API and confirm scope |
| | 2.3 Shared Adapter Interface Contract | `fetchConsentRecords` / `fetchFlows` / `fetchMessageLogs` contract (NFR-11) |
| | 2.4 Build Klaviyo Adapter | Production adapter |
| | 2.5 Build Postscript Adapter | Production adapter |
| | 2.6 Build Shopify Adapter | Production adapter |

## Phase 3 — Rule Engine & the Ten Compliance Checks

Task 3.1 must be built before any check. Tasks 3.12–3.14 come after all ten checks. Each check can be toggled and versioned on its own.

| Status | Task | FR | Delivers |
|---|---|---|---|
| | 3.1 Rule Engine Skeleton | Infra | Stateless, versioned rule-evaluation engine |
| | 3.2 Consent Language Check | FR-3.1 | Disclosure not pre-checked, unbundled, names sender/type/frequency |
| | 3.3 Quiet Hours Check | FR-3.2 | Jurisdiction-versioned quiet hours (federal + FL/OK) |
| | 3.4 STOP Suppression Check | FR-3.3 | Cross-flow STOP suppression |
| | 3.5 HELP Response Content Check | FR-3.4 | Brand ID, support contact, opt-out instructions |
| | 3.6 Frequency Cap Check | FR-3.5 | State caps incl. Oklahoma 3-per-24h |
| | 3.7 SHAFT Content Check | FR-3.6 | Sex/Hate/Alcohol/Firearms/Tobacco screening |
| | 3.8 Consent Revocation Check | FR-3.7 | 10-business-day revocation suppression (April 2025 FCC rule) |
| | 3.9 Jurisdiction Exposure Flag | FR-3.8 | Exposure by inferred subscriber state |
| | 3.10 Known-Litigant Suppression Check | FR-3.9 | Known-litigant matching + high-risk flag |
| | 3.11 Reassigned Numbers Check | FR-3.10 | FCC reassigned-numbers DB (or commercial equivalent) |
| | 3.12 Rule Engine Unit Test Suite | Infra | True-positive/negative fixtures for all ten checks |
| | 3.13 pg-boss Job Queue & Fan-Out Orchestrator | Infra | Scan orchestration across all checks |
| | 3.14 Scan Performance Tuning — 250k SLA | Infra | 250,000 subscribers in under 30 min (FR-4.4) |

**Phase 3 is done when** all ten checks are built and individually toggleable and versioned, 3.12's fixtures pass, 3.13 runs all ten in a single scan, and 3.14 meets the SLA.

## Phase 4 — Findings, Remediation & Reporting UI

| Status | Task | Delivers |
|---|---|---|
| | 4.1 Findings Dashboard UI | Grouped by severity/category (FR-5.1) |
| | 4.2 Finding Detail View | Citation, entity, remediation (FR-5.2) |
| | 4.3 Finding Lifecycle State Machine | Acknowledged / Resolved / False-Positive (FR-5.3) |
| | 4.4 Historical Trend View | Opened vs resolved (FR-5.4) |
| | 4.5 Re-Verification & Auto-Close Logic | Auto-close on re-scan (FR-5.5) |
| | 4.6 Remediation Text Generation | LLM-assisted, confidence-gated (FR-6.1/6.2) |
| | 4.7 PDF/CSV Report Export | Disclaimer-watermarked export (FR-7.2) |
| | 4.8 Findings Filtering | Severity/category/platform/status (FR-7.3) |
| | 4.9 Notification Service | Critical-finding + scan-complete email (FR-8.1/8.2) |
| | 4.10 Notification Preferences UI | Per-user preferences (FR-8.3) |

## Phase 5 — Agency Mode, Admin & Access Control

| Status | Task | Delivers |
|---|---|---|
| | 5.1 Scaffold Apps Admin | Internal AI Lab rule-admin app (FR-9) |
| | 5.2 Rule CRUD UI & Effective Dating | Versioned rules with future effective dates (FR-9.1/9.2) |
| | 5.3 Rule Change Audit Log | Who/when/before-after (FR-9.3) |
| | 5.4 RBAC Middleware | Role enforcement on every API/UI action (FR-12.3) |
| | 5.5 Multi-Client Agency Mode | ClientOrg/agency structure (FR-10.1) — use the `-v2` EXPANDED workbook |
| | 5.6 Agency Aggregated Roll-Up View | Cross-client dashboard (FR-10.2) |
| | 5.7 Per-Client Export | Client-scoped export (FR-10.3) |

## Phase 6 — Compliance UX, Hardening & Launch

| Status | Task | Delivers |
|---|---|---|
| | 6.1 Disclaimer Placements | "Not legal advice" disclaimers (FR-14.1) |
| | 6.2 Prohibited Language Content Review | No absolute-assurance copy (FR-14.2) |
| | 6.3 Terms of Service Acceptance Flow | Required ToS acceptance (FR-14.3) |
| | 6.4 Data Minimization Audit | PII storage audit (FR-15.1) |
| | 6.5 5-Year Retention & Purge Job | Consent-record retention (FR-15.2) |
| | 6.6 Deletion Propagation | Source deletions → ConsentRecords (FR-15.3) |
| | 6.7 Multi-Tenant Isolation Test | Isolation on every UI/API path (FR-15.4) |
| | 6.8 Platform Independence Test | Findings survive disconnected integration (NFR-11) |
| | 6.9 Billing Tier Test | Tier crossing + pricing page (FR-11.5/11.6) |
| | 6.10 Full E2E Onboarding-to-Report Test | Connect-to-export journey (script reused by 6.12) |
| | 6.11 Security Review | Pre-launch review (NFR-1) |
| | 6.12 Shopify App Store Submission | Submit for review |
| | 6.13 Validation Discovery Calls | Pricing/check-priority validation (runs in parallel with the build) |

## Not yet covered

FRD v3.0 also specifies FR-16 to FR-24, which are not yet split into task runbooks:
- FR-16 native consent capture
- FR-17 identity and fraud verification
- FR-18 litigation defense packages
- FR-19 multi-channel consent lifecycle
- FR-20 outreach controls
- FR-21 expanded integrations
- FR-22 AI compliance layer
- FR-23 carrier and line-type intelligence
- FR-24 expanded analytics

They will continue as Phase 1.5 and Phase 7 without renumbering existing tasks. Before those runbooks are written, the FRD's open questions (§17) on consent-capture architecture, pricing model and infrastructure vendors need answers.
