# Multi-Tenant Conversion — Implementation & QA Audit Report

**System:** Lebbis Tailoring Management System (Next.js 16, TypeScript, Prisma 6, MySQL 8)
**Scope:** Convert the existing single-tenant app to a shared-database multi-tenant architecture, then audit the result.
**Date:** 2026-07-14

---

## 1. Executive Summary

The application was converted from an implicit single-tenant model (a loose, nullable `tenantId` string on each table, filtered manually and inconsistently) into an enforced shared-database multi-tenant architecture with a real `Tenant` entity, referential integrity, and a **fail-closed** isolation guarantee at the data-access layer.

The audit began by mapping the *actual* current state (not assumptions) via a full-codebase sweep. That sweep found the application layer was ~90% correctly scoped, but surfaced **four unauthenticated, unfiltered export endpoints that dumped every tenant's data**, plus an IDOR in order-total calculation and a structural gap (`PurchaseItem` had no `tenantId`). All were fixed and the fixes proven.

Isolation is now enforced by three layers: (1) required `tenantId` + foreign keys at the database, (2) explicit tenant filtering in every repository, and (3) a Prisma client extension that **throws** if any tenant-scoped query runs without a tenant filter — so a future "forgot the `WHERE`" becomes a loud error, not a silent leak.

**Overall implementation score: 92 / 100.** Points withheld for residual items that are lower-severity and partly inherent to the framework (static file serving of uploads, no super-admin UI, middleware runs at the edge without a DB tenant check). None block production for the intended use.

**Production readiness: READY**, conditional on the two Medium items below being accepted or scheduled.

---

## 2. What Was Implemented

| Area | Change |
|------|--------|
| **Tenant model** | New `Tenant` table: `id, businessName, slug (unique), ownerName, email, phone, address, logo, subscriptionPlan (enum), status (enum), createdAt, updatedAt`. |
| **Referential integrity** | Every one of the 20 business tables now has `tenantId` **NOT NULL** with a real `FOREIGN KEY → Tenant(id)` (`ON DELETE RESTRICT`). |
| **Structural gap** | `PurchaseItem` gained the missing `tenantId` column + FK + index. |
| **Migration** | `20260714064901_convert_to_multi_tenant` — hand-edited to insert the default tenant (`id = tenant_demo`) *before* FK validation, so all pre-existing production rows adopt it with **zero data loss** (verified: 3 customers, 4 orders, 2 users, all settings/categories intact). |
| **Automatic enforcement** | `src/lib/db/prisma.ts` now exports a guarded client (`prisma`) via a Prisma `$extends` query hook that fails closed, plus `prismaUnsafe` for the two legitimate cross-tenant operations (login-by-email, tenant provisioning). |
| **Auth** | Login resolves the tenant from the user's globally-unique email, stores `tenantId` in the JWT (never from client input), and **rejects suspended/cancelled tenants**. `requirePermission` re-checks against the DB, scoped by tenant. The dashboard layout locks out suspended tenants on every load. |
| **Security fixes** | 4 export routes now require auth and filter by tenant; `orderTotals` and the receipts/payment-edit lookups are tenant-scoped (closing IDOR); repository `update`/`delete` operations all filter by `tenantId` via `updateMany`/`deleteMany`. |
| **Uploads** | Logo and product images now write to per-tenant subdirectories. |
| **Indexes** | Added composite indexes: `Customer(tenantId,createdAt)`, `Order(tenantId,customerId)`, `Product(tenantId,categoryId)`, `Expense(tenantId,categoryId)`, `PurchaseItem(tenantId,purchaseId)`, `ActivityLog(tenantId,entityType,entityId)`. |
| **Provisioning** | `scripts/create-tenant.ts` onboards a new business (tenant + owner admin + default payment methods/categories). `prisma/seed.ts` creates the default tenant. |

---

## 3. Findings by Category

### 3.1 Security

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| S1 | **CRITICAL** | `GET /api/exports/{customers,orders,payments}.csv` and `orders.xlsx` had **no authentication and no tenant filter** — a plain `findMany({})` returning up to 5000 rows of every tenant's data to anyone. | **FIXED** — `requireAuth()` + `where: { tenantId }`. Verified: unauthenticated request now returns `307` (redirect to login), not data. |
| S2 | **HIGH** | `financeService.orderTotals(orderId)` fetched an order by id with no tenant check; callable during payment creation → cross-tenant order financials (IDOR). | **FIXED** — now `orderTotals(tenantId, orderId)` using `findFirst({ where: { id, tenantId } })`. Verified null across tenants. |
| S3 | **HIGH** | `/receipts?orderId=<id>` did `order.findUnique({ where: { id } })` with no tenant check — a guessed/reused order id from another tenant would render that tenant's receipt. | **FIXED** — scoped `findFirst({ where: { id, tenantId } })`. |
| S4 | **MEDIUM** | Hardcoded `tenantId ?? "tenant_demo"` fallback in login could misassign a tenant. | **FIXED** — removed; `tenantId` is now NOT NULL and taken from the user row. |
| S5 | **MEDIUM** | Repository `update`/`delete` looked up by `id` alone, relying on a prior ownership check in the caller — fragile if a caller is refactored. | **FIXED** — all now `updateMany`/`deleteMany({ where: { id, tenantId } })`. Cross-tenant writes affect 0 rows (proven). |
| S6 | **LOW (residual)** | Uploaded files live under `public/` and are served statically; per-tenant subdirectories now prevent *enumeration*, but a known URL is still reachable without an auth check. | **PARTIALLY MITIGATED** — see Remediation R1. |
| — | Info | Mass assignment: no server action accepts `tenantId` from client input; all derive it from the session. SQL injection: Prisma parameterizes all queries; no raw SQL in app code. XSS: React auto-escaping; CSV export quotes/escapes values. | No action. |

### 3.2 Multi-Tenant Isolation (proven by `scripts/test-isolation.ts`, 3 tenants A/B/C, 21 assertions)

- Tenant A's list/search/report queries return **only** A's rows.
- A **cannot read** B's expense, purchase, or order totals by id (IDOR denied → `null`).
- A's **update/delete** against B's records affect **0 rows**; B's data is unchanged.
- A **cannot reverse B's purchase stock** (throws; B's stock untouched).
- Supplier purchase history is tenant-scoped (A sees nothing for B's supplier).
- Financial reports never mix tenants (A's income/expenses/purchases equal A's data exactly).
- The guard **throws** on any unscoped query (`prisma.order.findMany()` → error).

### 3.3 Database

- ✅ All 20 business tables carry `tenantId NOT NULL` with a `Tenant` FK (verified via `information_schema`: 20 FKs present).
- ✅ No orphan rows; default tenant provisioned before FK validation.
- ✅ No NULL `tenantId` anywhere (pre-flight verified before applying NOT NULL).
- ✅ `email` remains globally unique **by design** — it lets login resolve the tenant without asking the user to pick one (the spec forbids manual tenant selection).
- Note: `onDelete: Restrict` on tenant FKs means a tenant cannot be deleted while it holds data — intentional (prevents accidental mass deletion). Offboarding should be an explicit, ordered cascade.

### 3.4 Performance

- ✅ Every hot query path is covered by a `tenantId`-leading composite index (list, search, date-range, status filters).
- ✅ Repositories use `Promise.all` for parallel count+rows; `groupBy`/`aggregate` for supplier/report totals (no N+1 in the aggregate paths).
- ⚠️ `productRepository.list` with `stock=low` fetches all products then filters in JS (low-vs-min is a two-column comparison MySQL can't index directly). Fine at current scale; revisit if a tenant exceeds ~10k products (R3).
- ⚠️ The guard adds one cheap in-process check per query (object inspection, no I/O) — negligible.

### 3.5 Code Quality

- ✅ Consistent repository pattern; tenant filtering centralized, not duplicated ad-hoc.
- ✅ `tsc --noEmit` clean; `next build` clean (46 routes); ESLint clean on changed files.
- ✅ Type safety preserved — the guarded client is typed as `PrismaClient`, so no call sites needed type changes.
- ✅ Transactions used for all multi-step financial/stock operations (`$transaction` in purchase create/reverse).
- Minor: the guard's tenant-presence check intentionally ignores `OR` branches (documented in-code) — our call sites never place `tenantId` inside an `OR`, and the guard is a backstop, not the primary control.

---

## 4. Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Cross-tenant data read/write via app/API | **Low (was Critical)** | Closed at 3 layers; proven by tests. |
| Cross-tenant data via direct static file URL | **Low** | Requires knowing a random UUID path; no listing. See R1. |
| Suspended tenant retains access up to JWT lifetime | **Low** | Mitigated: login rejects + layout re-checks every load. |
| Tenant deletion / offboarding mistakes | **Low** | `RESTRICT` FKs prevent accidental cascade. |
| Regression from missed `tenantId` in future code | **Low** | Guard fails closed → surfaces immediately in dev/test. |

---

## 5. Prioritized Remediation Plan

**Already fixed (this change):** S1, S2, S3, S4, S5 — all Critical/High items.

Remaining, in priority order:

- **R1 (Medium) — Gate upload serving.** *Logos: RESOLVED (2026-07-14)* — the business logo is now stored as a compact WebP **data URL inside the tenant's Setting row** (sharp-resized to ≤240px), so it never touches `public/` and is fully tenant-isolated in the DB; this also fixed a bug where logo uploads did not persist/serve reliably. *Product images: still on disk* under per-tenant subdirs — if strict isolation is needed there, move them behind an authenticated `/api/files/[...]` route (product images are larger/more numerous, so data-URL-in-DB is less suitable for them).
- **R2 (Low) — Super-admin tenant management UI. ✅ IMPLEMENTED (2026-07-14).** Added an `isSuperAdmin` flag on `User` (a platform-level axis, orthogonal to tenant roles), a DB-backed `requireSuperAdmin()` guard, and a gated `/platform/tenants` console (list all businesses with counts, onboard new ones, edit, suspend/reactivate, change plan). It lives outside the tenant `(dashboard)` layout and is invisible/inaccessible to tenant admins. Provisioning is shared with `scripts/create-tenant.ts` via `src/lib/tenant-provisioning.ts`. Access control proven by `scripts/test-tenant-lifecycle.ts` and the platform access-control smoke test (non-super-admin → 307 redirect, no platform content).
- **R3 (Low) — Low-stock query.** If product catalogs grow large, replace the in-JS low-stock filter with a generated boolean column or raw indexed comparison.
- **R4 (Low) — Edge tenant checks.** `middleware.ts` validates session presence only (it runs on the edge without DB access). Tenant status/validity is enforced at the data layer and layout; if desired, add a lightweight signed tenant-status claim to the JWT for edge-level checks.

---

## 6. Verification Evidence (re-runnable)

| Command | Proves |
|---------|--------|
| `npx tsx scripts/test-guard.ts` | The fail-closed guard: 11 checks (unscoped queries throw, scoped pass, compound-unique upserts pass, `prismaUnsafe` bypasses). |
| `npx tsx scripts/test-isolation.ts` | End-to-end isolation across tenants A/B/C: 21 checks (reads, writes, IDOR, stock, reports, search). |
| `npx tsx scripts/test-tenant-lifecycle.ts` | Platform admin lifecycle: 8 checks (provision → owner login → suspend → login 403 → reactivate → login 200 → duplicate rejected). |
| Platform access-control smoke | Super-admin reaches `/platform/tenants`; non-super-admin gets `307` to `/dashboard` and sees no platform content or nav link. |
| `npx tsc --noEmit` | Type safety across the refactor. |
| `npm run build` | 46 routes compile. |
| HTTP smoke (all pages + exports) | Every page renders under the guard (no query missing `tenantId`); unauthenticated export blocked; authenticated export scoped. |

**Result: all checks passing.** A pre-migration JSON data backup was taken before applying the schema change.

---

## 7. Files Changed (summary)

- `prisma/schema.prisma` — `Tenant` model, enums, NOT NULL `tenantId` + FKs on 20 models, `PurchaseItem.tenantId`, composite indexes.
- `prisma/migrations/20260714064901_convert_to_multi_tenant/` — schema migration + default-tenant data step.
- `prisma/seed.ts` — creates the default tenant.
- `src/lib/db/prisma.ts` — guarded client + `prismaUnsafe`.
- `src/lib/tenant.ts` — tenant helpers (status check, scope fragment).
- `src/lib/auth/guards.ts` — tenant-scoped permission lookup.
- `src/app/api/auth/login/route.ts` — tenant resolution + suspended-tenant rejection.
- `src/app/(dashboard)/layout.tsx` — suspended-tenant lockout.
- `src/app/api/exports/*` (4 routes) — auth + tenant filter.
- `src/lib/services/finance-service.ts`, `src/app/(dashboard)/payments/actions.ts` — `orderTotals` scoping.
- `src/app/(dashboard)/receipts/page.tsx`, `payments/[id]/edit/page.tsx` — scoped lookups.
- `src/lib/repositories/{expense,employee,salary,supplier,product,purchase}-repository.ts` — tenant-scoped update/delete; nested `PurchaseItem` tenantId.
- `src/app/(dashboard)/{expenses,employees,suppliers,products}/actions.ts` — pass `tenantId` to repository mutations.
- `src/app/(dashboard)/{settings,products}/actions.ts` — per-tenant upload paths.
- `scripts/create-tenant.ts`, `scripts/test-guard.ts`, `scripts/test-isolation.ts` — provisioning + audit tooling.
