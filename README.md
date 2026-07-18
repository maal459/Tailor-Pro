# Tailor Pro — Multi-Tenant Tailoring Management Platform

A production SaaS platform for tailoring businesses. One deployment serves many independent
shops ("tenants"), each with its own customers, orders, measurements, payments, inventory,
and finance — plus a **Platform Admin** console where the platform owner manages tenants,
subscription plans, invoicing, and online payment collection (ZAAD / eDahab).

**Live:** https://tailorpro.hadaftech.net

| | |
|---|---|
| Framework | Next.js 16 (App Router, server components + server actions) |
| Language | TypeScript |
| Database | MySQL 8 via Prisma 6 |
| Styling | Tailwind CSS 4 |
| Auth | JWT session cookie (httpOnly, Secure), bcrypt passwords |
| Validation | Zod |
| Process | PM2 behind nginx + Let's Encrypt |

Companion docs: [README-MULTI-TENANT.md](README-MULTI-TENANT.md) (deep dive: isolation
model, billing engine, gateway go-live) · [MULTI-TENANT-QA-REPORT.md](MULTI-TENANT-QA-REPORT.md)
(isolation audit).

---

## 1. Architecture at a glance

```
                        ┌──────────────────────────────────┐
                        │            Next.js app           │
                        │                                  │
  Tenant staff ────────▶│  /(dashboard)/*   tenant app     │
  (per shop)            │  /billing         self-service   │──── pays subscription
                        │                   portal         │     (reachable even
                        │                                  │      when suspended)
  Platform owner ──────▶│  /platform/*      PLATFORM ADMIN │
  (super-admin)         │  /api/billing/webhook/[provider] │◀─── ZAAD / eDahab
                        └────────────────┬─────────────────┘     callbacks
                                         │
                              Prisma (guarded client)
                                         │
                        ┌────────────────▼─────────────────┐
                        │       One shared MySQL DB        │
                        │  every business row carries      │
                        │  tenantId (fail-closed guard)    │
                        └──────────────────────────────────┘
```

- **Tenant app** (`src/app/(dashboard)`) — what a shop's staff uses daily.
- **Billing portal** (`src/app/billing`) — deliberately *outside* the dashboard's
  suspension lockout, so an unpaid tenant can still log in, pay, and self-reactivate.
- **Platform Admin** (`src/app/platform`) — super-admin-only console (§4).
- **Webhooks** (`src/app/api/billing/webhook/[provider]`) — signature-verified,
  idempotent settlement of asynchronous mobile-money payments.

---

## 2. Database & Prisma

Schema: [prisma/schema.prisma](prisma/schema.prisma). One MySQL database, shared by all
tenants, with **row-level isolation**: every business table has `tenantId VARCHAR(36) NOT NULL`
with a foreign key → `Tenant(id)` (`onDelete: Restrict`).

### 2.1 Model map

**Platform-level tables** (cross-tenant by design — accessed via `prismaUnsafe`, *not*
registered in the tenant guard):

| Model | Purpose |
|---|---|
| `Tenant` | One business: name, unique `slug`, `subscriptionPlan`, `status`, billing state (`billingCycle`, `currentPeriodEnd`, `autoCollect`, `gatewayProvider`, `gatewayPayerRef`) |
| `PlanPrice` | Editable price book — one row per plan (monthly/yearly price). Falls back to code defaults in `src/lib/billing/plans.ts` when a row is missing |
| `SubscriptionInvoice` | One bill per tenant per period (`PENDING → PAID / OVERDUE / CANCELLED`) |
| `SubscriptionPayment` | Money received from a tenant; `gatewayRef` stores the ZAAD/eDahab transaction id |
| `GatewayCharge` | One online-charge attempt (`PENDING → SUCCESS / FAILED`); its `id` is the reference echoed back by the gateway webhook, making settlement idempotent |

**Tenant-scoped tables** (every query must carry `tenantId` — enforced by the guard):

| Domain | Models |
|---|---|
| People & auth | `User` (globally-unique email; `isSuperAdmin` flag; per-user `permissions` JSON) |
| Sales | `Customer`, `Order`, `OrderItem`, `Payment`, `PaymentMethod`, `GarmentType` |
| Measurements | `MeasurementProfile`, `Measurement` |
| Inventory | `ProductCategory`, `Product`, `Supplier`, `Purchase`, `PurchaseItem` |
| Finance | `ExpenseCategory`, `Expense`, `Employee`, `Salary` |
| System | `ActivityLog` (audit trail), `Setting` (per-tenant key/value: branding, receipt text, currency) |

Enums: `SubscriptionPlan` (FREE/BASIC/PRO/ENTERPRISE), `TenantStatus`
(ACTIVE/SUSPENDED/CANCELLED), `BillingCycle` (MONTHLY/YEARLY), `InvoiceStatus`,
`SubscriptionPaymentMethod` (CASH/ZAAD/EDAHAB/…), `GatewayChargeStatus`, `OrderState`,
`Priority`, `PaymentMethodCode`, `Gender`.

### 2.2 The fail-closed tenant guard

`src/lib/db/prisma.ts` exports **two** clients:

| Export | Use |
|---|---|
| `prisma` | **Everything tenant-scoped.** A `$extends` wrapper that **throws** (`"Tenant isolation violation"`) if any tenant-scoped model is queried without `tenantId` in `where` (reads/updates/deletes) or `data` (creates). A forgotten filter becomes a loud error, never a cross-tenant leak |
| `prismaUnsafe` | Raw client. Only for genuinely cross-tenant work: login-by-email, tenant provisioning, and the platform billing tables above |

Rules that follow from the guard:
- `findUnique({ where: { id } })` on a tenant-scoped model **throws** → use
  `findFirst({ where: { id, tenantId } })`.
- Updates/deletes go through `updateMany`/`deleteMany({ where: { id, tenantId } })`.
- Nested creates (order items, measurements, purchase items) must set `tenantId` on
  **each** nested row — the guard doesn't see nested writes.
- Raw SQL (`$queryRawUnsafe`) bypasses the guard: always parameterized (`?`), always
  filter `tenantId` explicitly in every subquery (see `receivables-repository.ts`).

### 2.3 Migrations

Migrations live in `prisma/migrations/` (8 to date: init → notifications → permissions →
finance/inventory → multi-tenant conversion → super-admin flag → subscription billing →
gateway charges).

> **Important — this project uses `migrate deploy`, not `migrate dev`.**
> Two early migrations were edited after being applied (a Linux table-name-casing fix), so
> `prisma migrate dev` flags a checksum mismatch and demands a **reset — never accept it**
> (live data). To add a migration:
> 1. Hand-write `prisma/migrations/<timestamp>_<name>/migration.sql` — MySQL-8 syntax,
>    **CamelCase table names** (Linux MySQL is case-sensitive), no `ADD COLUMN IF NOT EXISTS`.
> 2. `npx prisma migrate deploy` (ignores checksums of already-applied migrations).
> 3. `npx prisma generate` — run explicitly: if `npm install` was a no-op it skips Prisma's
>    postinstall and the client goes stale (build then fails on new models).
> On Windows dev: stop the dev server first — it holds the query-engine DLL lock.

### 2.4 Performance conventions

With imported histories (7k+ customers/orders per tenant) the codebase follows one rule
everywhere: **detail lists show at most the ~20 latest rows; totals/breakdowns are computed
in the database** (`aggregate` / `groupBy` / grouped raw SQL), never by loading a table into
Node. Customer/order pickers are server-backed comboboxes
(`/api/search/customers|orders|profiles`, phone-first, capped at 20) — nothing ships a full
table to the browser.

---

## 3. Multi-tenancy lifecycle

- **Provision** — `/platform/tenants` → *Onboard New Business* (or
  `npx tsx scripts/create-tenant.ts "Name" slug owner@email pass`). Creates the `Tenant`,
  its owner admin user, and defaults (payment methods, garment types, categories). New
  tenants start FREE/ACTIVE.
- **Login** — by globally-unique email; the user's tenant is resolved server-side.
  `tenantId` is **never** accepted from the client.
- **Suspend** — `status = SUSPENDED` rejects login and locks the dashboard, showing a
  "Pay subscription" screen that links to `/billing`. Data is untouched.
- **Reactivate** — automatic on payment, or manually from `/platform/tenants`.
- **Plan caps** — enforced at create time (`src/lib/billing/limits.ts`): FREE 1 user /
  25 customers, BASIC 3 / 500, PRO 10 / 5,000, ENTERPRISE unlimited. Exceeding shows an
  "upgrade your plan" error.

---

## 4. Platform Admin (`/platform`)

Only users with `User.isSuperAdmin = true` can reach any `/platform` route — every page and
server action calls `requireSuperAdmin()` (DB-backed, not just the JWT). The "Platform
Admin" sidebar link is likewise gated. Platform pages use `prismaUnsafe` because their job
is cross-tenant.

### 4.1 Tenants (`/platform/tenants`)

- KPI cards (total / active / suspended businesses).
- **Onboard New Business** — creates tenant + owner in one step.
- Per-tenant: edit details/plan/status, **Suspend / Reactivate** (instant lockout/restore).
- Edit page includes the **Billing & subscription panel**: billing cycle (monthly / yearly
  = 2 months free), gateway provider + payer wallet for auto-collect, paid-through date,
  and *Generate invoice now*.

### 4.2 Finance (`/platform/finance`)

- **KPIs** — MRR (annual plans amortised), collected this month / all-time, outstanding +
  overdue count.
- **Gateway status card** — live/not-configured chip per provider, the exact webhook URLs
  to register, and a **go-live checklist** showing which env vars are set (✓/○, names only,
  never values).
- **Businesses & subscriptions table** — filter by plan and join-date; per row: open
  invoice with due date, **Record payment** (cash/ZAAD/eDahab/bank + reference →
  marks paid, advances paid-through, auto-reactivates), **Charge ZAAD/eDahab** (pushes an
  online charge to the tenant's registered wallet), **Invoice** (printable), **Cancel**,
  or **Generate invoice**.
- **Recent subscription payments** — with printable **Receipt** links.
- **Run billing cycle** — the dunning job, on demand (see §4.4).

### 4.3 Plans & Pricing (`/platform/plans`)

Pricing cards for FREE / BASIC ($15/mo) / PRO ($35/mo) / ENTERPRISE ($75/mo) with enforced
limits and feature lists. Prices are **editable in the UI** — saved to the `PlanPrice`
table (no redeploy needed); yearly price convention is monthly × 10 (2 months free).

### 4.4 Billing engine & dunning

Code: `src/lib/billing/` (`plans.ts` config → `pricing.ts` price book → `invoices.ts`
engine → `charges.ts` online payments → `gateway/` adapters → `limits.ts` caps).

`runBillingCycle()` — idempotent; runs daily via cron **and** from the Finance button:
1. **Auto-collect** — charges opted-in tenants' wallets for due invoices.
2. **Flag overdue** — due `PENDING` invoices become `OVERDUE`.
3. **Suspend** — tenants overdue **> 14 days** (`GRACE_PERIOD_DAYS`) are suspended, with an
   activity-log entry.

Each tenant renews on **its own anniversary** (`currentPeriodEnd`); paying an invoice
advances it by exactly one period. No double-billing: a tenant with an open invoice can't
get another.

```cron
0 6 * * *  cd /var/www/tailor-pro && npx tsx scripts/run-billing-cycle.ts >> /var/log/tailor-billing.log 2>&1
```

### 4.5 Online payments (ZAAD / eDahab)

Three entry points, one async-safe path (tenant self-service on `/billing`, admin
*Charge* button, auto-collect). Every attempt is a `GatewayCharge`; immediate approvals
settle synchronously, deferred ones settle via the **signature-verified webhook**
(`POST /api/billing/webhook/zaad|edahab`) — idempotently, so duplicate callbacks never
double-credit. Successful payment marks the invoice paid, advances paid-through, and
reactivates a suspended tenant.

Credentials are **env vars only** (never in the DB). Until set, adapters report
"not configured" and manual recording still works:

```
ZAAD_API_URL  ZAAD_MERCHANT_UID  ZAAD_API_USER_ID  ZAAD_API_KEY  ZAAD_WEBHOOK_SECRET
EDAHAB_API_URL  EDAHAB_API_KEY  EDAHAB_SECRET_KEY  EDAHAB_AGENT_CODE
```

Funds land in the merchant account those keys belong to. Verify before launch with a real
1-cent charge to your own wallet: `npx tsx scripts/test-gateway-connection.ts ZAAD 63XXXXXXX 0.01`.
`BILLING_SANDBOX=true` fake-approves for local testing — **hard-disabled in production**
(`isSandbox()` returns false when `NODE_ENV=production`).

### 4.6 Tenant-facing billing

- `/billing` — plan summary, outstanding invoice with **Pay with ZAAD/eDahab**, history.
- `/billing/invoices/[id]` and `/billing/receipts/[id]` — printable documents issued by
  the platform, billed to the business; accessible to the owning tenant or a super-admin.

---

## 5. Tenant application (summary)

Customers (phone = primary identifier, phone-first search everywhere) · Orders (status
workflow, priorities, per-item garments/fabric/measurement profile) · Measurements
(reusable per-garment profiles) · Payments (installments, balances, receipts) ·
Receivables (outstanding balances, date/customer filter, full-set total) · Ledger &
printable payment history · Products/stock, Suppliers, Purchases (transactional stock-in) ·
Expenses & Salaries · Reports (daily, sales, expenses, salaries, purchases, stock,
profit/loss — Today/Week/Month/Year/**All Time**/Custom) · Per-tenant branding (logo +
brand color, applied across UI and receipts) · Role/permission-based users · Full CRUD
with guarded deletes; order/purchase *edit* covers workflow fields, not line items (by
design — item changes go through create/delete to keep balances and stock correct).

---

## 6. Development setup

```bash
cp .env.example .env        # set DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate deploy   # NOT migrate dev — see §2.3
npx prisma generate
npm run prisma:seed         # demo tenant + admin
npm run dev                 # http://localhost:3000
```

Useful env flags in development: `BILLING_SANDBOX=true` (fake gateway approvals),
`COOKIE_SECURE=false` (plain-HTTP cookie).

**Windows quirks:** run node/prisma through PowerShell; stop the dev server before
`prisma generate` (DLL lock); MySQL 8 syntax only in hand-written migrations.

### Scripts (`scripts/`, run with `npx tsx`)

| Script | Purpose |
|---|---|
| `create-tenant.ts` | Provision a business + owner |
| `seed-plan-prices.ts` | Seed the editable price book (idempotent) |
| `run-billing-cycle.ts` | Dunning run — cron daily in production |
| `test-billing.ts` | Billing engine smoke test (17 checks, self-cleaning) |
| `test-charges.ts` | Online-payment/webhook settlement test (10 checks, incl. idempotency) |
| `test-gateway-connection.ts` | REAL charge to verify live gateway credentials |
| `import-legacy-dump.ts` | Load a legacy phpMyAdmin dump into a temp DB |
| `migrate-legacy.ts` / `migrate-legacy-purchases.ts` | Idempotent ETL of a legacy tailor DB into a tenant (dry-run by default; `--commit` to write) |
| `test-isolation.ts`, `test-guard.ts`, `test-tenant-lifecycle.ts`, `test-branding.ts` | Multi-tenant regression tests |

---

## 7. Production deployment

DigitalOcean droplet · app at `/var/www/tailor-pro` · PM2 process `tailor-pro` on port 3005
· nginx reverse-proxy for `tailorpro.hadaftech.net` with Let's Encrypt · self-hosted
MySQL 8 (`tailor_pro`) · only ports 22/80/443 open.

Redeploy:

```bash
cd /var/www/tailor-pro && git pull && npm install \
  && npx prisma migrate deploy && npx prisma generate \
  && NODE_OPTIONS=--max-old-space-size=1024 npm run build \
  && pm2 restart tailor-pro
```

(RAM-tight box: build with `nice -n 10 ionice -c3`, detached, and check the log's
`BUILD_EXIT` before restarting.)

`.env` on the server: `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECURE="true"`,
`NEXT_PUBLIC_APP_NAME`, plus the gateway vars when going live. Never set
`BILLING_SANDBOX` in production.

### Security posture

Fail-closed tenant guard · DB-backed super-admin gate on all `/platform` routes ·
auth + tenant scoping on every API/export route · parameterized raw SQL ·
signature-verified webhooks (constant-time compare) · login rate-limit (15 tries /
10 min per IP, fail-open) · httpOnly+Secure JWT cookies · bcrypt · sandbox hard-off in
production · per-tenant upload directories.
