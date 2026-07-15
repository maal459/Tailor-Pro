# Tailor Pro — Multi-Tenant & Subscription Guide

This document explains how Tailor Pro serves many independent tailoring businesses
("tenants") from one deployment and one database, and how the platform bills those
businesses for their subscriptions (Basic / Pro / Enterprise), including automatic
mobile-money collection (ZAAD / eDahab) and auto-suspension of unpaid accounts.

It is written for whoever operates the platform — not for the individual shops.

---

## 1. The multi-tenant model at a glance

- **Shared database, row-level isolation.** Every business-owned table has a
  `tenantId` column (`NOT NULL`, foreign key → `Tenant.id`). One MySQL database holds
  every tenant's data; each row is stamped with the tenant that owns it.
- **A tenant = one business.** The `Tenant` model holds the business name, unique
  `slug`, contact details, `subscriptionPlan`, `status`, and its billing state.
- **Users belong to exactly one tenant.** Login is by globally-unique email, which
  resolves the user *and* their tenant. `tenantId` is never accepted from the client.
- **Super-admins are a separate axis.** `User.isSuperAdmin` is a platform-level flag,
  orthogonal to a tenant's own `admin`/`staff` roles. Only super-admins reach `/platform/*`.

### Isolation is enforced in three layers

1. **Database** — `tenantId` is `NOT NULL` with `onDelete: Restrict` foreign keys, so a
   tenant can never be deleted out from under its data, and no row is tenant-less.
2. **Repositories / queries** — every read filters by `tenantId`; updates and deletes use
   `updateMany` / `deleteMany({ where: { id, tenantId } })`, never `update`/`delete` by id.
3. **Fail-closed Prisma guard** (`src/lib/db/prisma.ts`) — the exported `prisma` client
   throws `"Tenant isolation violation"` if a tenant-scoped model is queried without a
   `tenantId` in `where` (reads/updates/deletes) or `data` (creates). A forgotten filter
   becomes a loud error, not a silent data leak.

### `prisma` vs `prismaUnsafe`

| Client | Use for |
| --- | --- |
| `prisma` (guarded) | **Everything tenant-scoped.** Always pass `tenantId`. |
| `prismaUnsafe` (raw) | Only genuinely cross-tenant / pre-tenant work: login-by-email, tenant provisioning, and the **platform billing tables** (they describe the platform charging tenants, so they are inherently cross-tenant). |

Rules of thumb:
- `findUnique({ where: { id } })` on a tenant-scoped model **throws** under the guard —
  use `findFirst({ where: { id, tenantId } })`.
- Nested creates (order items, measurements, purchase items) must include `tenantId` on
  **each** nested row — the guard doesn't see nested writes.

---

## 2. Provisioning a business

Via the platform console: **`/platform/tenants` → Onboard New Business**.

Via script:

```bash
npx tsx scripts/create-tenant.ts "Style Tailors" style-tailors owner@style.com secret123 "Aisha"
```

Both call `provisionTenant()` (`src/lib/tenant-provisioning.ts`), which creates the
`Tenant`, its owner `admin` user, and sensible defaults (payment methods, garment types,
expense/product categories). New tenants start on the **FREE** plan and **ACTIVE** status.

---

## 3. Subscription plans & pricing

Plans are defined in code (`src/lib/billing/plans.ts`) with **editable prices** stored in
the `PlanPrice` table. If a plan has no `PlanPrice` row, the app falls back to the code
default — so pricing always works, and a super-admin can change prices in the UI without a
redeploy (**`/platform/plans`**).

| Plan | Monthly | Yearly (2 months free) | Staff users | Customers | Products |
| --- | --- | --- | --- | --- | --- |
| **Free** | $0 | — | 1 | 25 | 25 |
| **Basic** | **$15** | $150 | 3 | 500 | 300 |
| **Pro** | **$35** | $350 | 10 | 5,000 | 5,000 |
| **Enterprise** | **$75** | $750 | Unlimited | Unlimited | Unlimited |

- **Annual = 2 months free** (`yearlyPrice = monthlyPrice × 10`).
- **Limits are enforced.** Creating a user/customer/product beyond the plan cap is blocked
  with an *"Upgrade your plan"* message (`assertWithinPlanLimit`, wired into the create
  actions for users, customers, and products). Enterprise is unlimited (`null` cap).

### How to charge customers — recommended flow

1. **Onboard on Free.** Let a shop try Tailor Pro with real data (1 user, 25 customers).
2. **Move them to a paid plan** when they commit: edit the tenant at
   `/platform/tenants/<id>/edit` and set the plan + billing cycle (monthly or yearly).
3. **Issue the first invoice** — "Generate invoice now" on the tenant, or the
   **Generate invoice** button on `/platform/finance`. The invoice is due immediately;
   the tenant has a **14-day grace period** before auto-suspension.
4. **Collect payment:**
   - *Manually* — record a Cash / ZAAD / eDahab / Bank payment on the finance page
     (**Record payment**). This marks the invoice paid and advances the paid-through date.
   - *Automatically* — enable **auto-collect** with a gateway + payer wallet (see §5).
5. **Renew** — each period, generate the next invoice (or let the cron do it) and collect.
   Paying a renewal advances the tenant's `currentPeriodEnd`.

---

## 4. The billing engine

Code lives in `src/lib/billing/`:

| File | Responsibility |
| --- | --- |
| `plans.ts` | Plan definitions: prices, limits, features, grace period. |
| `pricing.ts` | Effective price book (DB `PlanPrice` over code defaults) + seeding. |
| `invoices.ts` | Generate invoices, record payments, the dunning cycle, dashboard aggregates. |
| `limits.ts` | Enforce per-plan caps on users/customers/products. |
| `gateway/` | Mobile-money gateway adapters (ZAAD, eDahab) behind a common interface. |

Data model (all platform-level, accessed via `prismaUnsafe`):

- **`SubscriptionInvoice`** — one bill per tenant per period (`PENDING` → `PAID` /
  `OVERDUE` / `CANCELLED`). Carries plan, cycle, amount, period, due date.
- **`SubscriptionPayment`** — money received against an invoice. `gatewayRef` stores the
  ZAAD/eDahab transaction id for reconciliation.
- **`PlanPrice`** — editable price book, one row per plan.
- **`Tenant`** billing fields — `billingCycle`, `currentPeriodEnd` (paid-through date),
  `autoCollect`, `gatewayProvider`, `gatewayPayerRef`.

Key behaviours:
- **No double-billing** — a tenant with an open (PENDING/OVERDUE) invoice won't get a
  second one.
- **Paying reactivates** — recording a payment on a tenant that was suspended for
  non-payment flips it back to `ACTIVE` automatically. An intentionally `CANCELLED`
  tenant is left alone.
- **Paid-through advances** on payment (`currentPeriodEnd = invoice.periodEnd`), so the
  next period starts where the last one ended.

---

## 5. Automatic payment collection (ZAAD & eDahab)

Somali mobile-money wallets can charge tenants automatically on renewal. Each provider is
an adapter implementing the `PaymentGateway` interface (`src/lib/billing/gateway/`). Until
credentials are supplied, an adapter reports `isConfigured() === false` and collection
falls back to manual — nothing breaks.

**To enable a gateway, set env vars and restart the app:**

ZAAD (via the WaafiPay pre-authorize API, which also serves EVC/eDahab):

```
ZAAD_API_URL=https://api.waafipay.net/asm
ZAAD_MERCHANT_UID=...
ZAAD_API_USER_ID=...
ZAAD_API_KEY=...
```

eDahab (hash-signed REST API):

```
EDAHAB_API_URL=https://edahab.net/api/api
EDAHAB_API_KEY=...
EDAHAB_SECRET_KEY=...
EDAHAB_AGENT_CODE=...
```

> The exact endpoints/credentials depend on the merchant account and aggregator you sign
> up with. The adapters implement the standard request/response shape (a USSD push the
> customer approves on their phone); fill in the values above to go live. No other code
> changes are required.

**Per-tenant setup:** on the tenant edit page, choose the gateway, enter the payer wallet
number (`gatewayPayerRef`), and tick **Auto-collect on renewal**. The billing cycle then
attempts to charge that wallet for any due invoice; a success records a
`SubscriptionPayment` with method `ZAAD`/`EDAHAB` and the gateway's transaction id.

---

## 6. Deactivating unpaid businesses (dunning)

Suspension is the same mechanism used everywhere: a tenant with `status = SUSPENDED` is
rejected at login and shown an *"Account unavailable"* notice in the dashboard (its data is
untouched and returns the moment it's reactivated).

The **billing cycle** (`runBillingCycle`) drives this automatically:

1. **Auto-collect** — charge opted-in tenants' wallets for due invoices.
2. **Flag overdue** — `PENDING` invoices past their due date become `OVERDUE`.
3. **Suspend** — tenants with an invoice overdue **more than 14 days** (the grace period,
   `GRACE_PERIOD_DAYS`) are set to `SUSPENDED`, with an activity-log entry.

Run it:
- **On demand** — "Run billing cycle" button on `/platform/finance`.
- **On a schedule (production)** — daily cron on the droplet:

  ```cron
  0 6 * * *  cd /var/www/tailor-pro && npx tsx scripts/run-billing-cycle.ts >> /var/log/tailor-billing.log 2>&1
  ```

Reactivation is automatic when the tenant pays, or manual via
**`/platform/tenants` → Reactivate**.

---

## 7. The platform console (`/platform`, super-admins only)

- **Tenants** — list, onboard, edit, suspend/reactivate businesses; per-tenant billing
  settings.
- **Finance** — MRR, collected (this month / all-time), outstanding & overdue, plan
  distribution, per-business invoices with **Generate invoice** / **Record payment** /
  **Cancel**, recent payments, and **Run billing cycle**.
- **Plans & Pricing** — edit each plan's monthly/yearly price; view enforced limits and
  features.

---

## 8. Operations & scripts

| Script | Purpose |
| --- | --- |
| `scripts/create-tenant.ts` | Provision a business + owner. |
| `scripts/seed-plan-prices.ts` | Write code-default prices into `PlanPrice` (idempotent). |
| `scripts/run-billing-cycle.ts` | Dunning run — cron this daily in production. |
| `scripts/test-billing.ts` | End-to-end smoke test of the billing engine (self-cleaning). |
| `scripts/test-isolation.ts`, `test-guard.ts`, `test-tenant-lifecycle.ts` | Multi-tenant isolation regression tests. |

**Migrations:** this deployment carries an intentional local checksum mismatch on two
early migrations (a Linux table-name-casing fix applied after they were first run). Use
`prisma migrate deploy` to apply new migrations — **never** `prisma migrate reset` (it
drops live data). New migrations are hand-written in MySQL-8 syntax with CamelCase table
names so they run on case-sensitive Linux MySQL.

**Environment:** run all `node`/`npm`/`prisma`/`tsx` commands through PowerShell on the dev
box; stop the `next dev` server before `prisma generate` (it holds the query-engine DLL lock).

---

## 9. Adding a new tenant-scoped feature (checklist)

1. Add the model with `tenantId String @db.VarChar(36)` + FK → `Tenant` (`onDelete: Restrict`).
2. Register the model name in `TENANT_SCOPED_MODELS` in `src/lib/db/prisma.ts`.
3. Always query through `prisma` with a `tenantId` filter; include `tenantId` on nested creates.
4. If the feature has creatable resources you want to cap, add a case to
   `src/lib/billing/limits.ts` and a limit to `PLAN_DEFINITIONS`.
5. Add a `scripts/test-*.ts` isolation check.

> **Do not** add platform billing tables (`SubscriptionInvoice`, `SubscriptionPayment`,
> `PlanPrice`) to `TENANT_SCOPED_MODELS` — they are cross-tenant by design and use
> `prismaUnsafe`.
