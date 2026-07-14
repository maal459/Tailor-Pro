import { PrismaClient } from "@prisma/client";

/**
 * Multi-tenant safety net.
 *
 * `prisma` is a fail-closed client: any query against a tenant-scoped model that
 * does not carry a tenantId (in `where` for reads/updates/deletes, or in `data`
 * for creates) throws immediately instead of silently returning/mutating another
 * tenant's rows. This turns a forgotten `WHERE tenantId = ?` from a data leak into
 * a loud error that surfaces in tests and logs.
 *
 * The guard enforces that a tenant filter is PRESENT; the actual tenantId value is
 * always supplied by the caller from the authenticated session (never from client
 * input), so correctness of the value is guaranteed at the call sites.
 *
 * `prismaUnsafe` is the raw, unguarded client. Use it ONLY for genuinely
 * cross-tenant operations that run before a tenant context exists — currently just
 * login (looking a user up by their globally-unique email) and platform-level
 * tenant provisioning. Every use should be obvious in review.
 */

// Models that own a tenantId column and must never be touched without a tenant filter.
const TENANT_SCOPED_MODELS = new Set<string>([
  "User",
  "Customer",
  "GarmentType",
  "MeasurementProfile",
  "Measurement",
  "Order",
  "OrderItem",
  "PaymentMethod",
  "Payment",
  "ActivityLog",
  "ExpenseCategory",
  "Expense",
  "Employee",
  "Salary",
  "Supplier",
  "ProductCategory",
  "Product",
  "Purchase",
  "PurchaseItem",
  "Setting"
]);

// Operations whose `where` must include a tenant filter.
const WHERE_SCOPED_OPS = new Set<string>([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany"
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

/**
 * True when `where` constrains tenantId, either directly (`{ tenantId }`) or through
 * a Prisma compound-unique selector such as `{ tenantId_key: { tenantId, key } }`.
 * Intentionally checks direct/AND-level placement only — our call sites always place
 * tenantId as an AND-level sibling, never inside an OR branch that wouldn't isolate.
 */
function whereHasTenant(where: unknown): boolean {
  if (!isObject(where)) return false;
  if (where.tenantId !== undefined) return true;

  for (const [key, value] of Object.entries(where)) {
    if (key.startsWith("tenantId_") && isObject(value) && value.tenantId !== undefined) {
      return true;
    }
  }
  // AND arrays/objects: tenantId may live in an AND clause
  const and = where.AND;
  if (Array.isArray(and)) return and.some(whereHasTenant);
  if (isObject(and)) return whereHasTenant(and);

  return false;
}

function dataHasTenant(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0 && data.every(dataHasTenant);
  return isObject(data) && data.tenantId !== undefined;
}

function assertTenantScope(model: string | undefined, operation: string, args: unknown) {
  if (!model || !TENANT_SCOPED_MODELS.has(model)) return;

  const a = (isObject(args) ? args : {}) as Record<string, unknown>;

  if (operation === "create" || operation === "createMany" || operation === "createManyAndReturn") {
    if (!dataHasTenant(a.data)) {
      throw new Error(
        `Tenant isolation violation: ${model}.${operation} was called without a tenantId in data.`
      );
    }
    return;
  }

  if (operation === "upsert") {
    if (!whereHasTenant(a.where) || !dataHasTenant(a.create)) {
      throw new Error(
        `Tenant isolation violation: ${model}.upsert requires tenantId in both where and create.`
      );
    }
    return;
  }

  if (WHERE_SCOPED_OPS.has(operation)) {
    if (!whereHasTenant(a.where)) {
      throw new Error(
        `Tenant isolation violation: ${model}.${operation} was called without a tenantId filter in where.`
      );
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prismaGuarded?: PrismaClient;
};

const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: ["warn", "error"]
  });

/** Unguarded client — cross-tenant/pre-tenant use only (login, tenant provisioning). */
export const prismaUnsafe = base;

/** Tenant-guarded client — use everywhere else. Fails closed on missing tenant scope. */
export const prisma =
  globalForPrisma.prismaGuarded ??
  (base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          assertTenantScope(model, operation, args);
          return query(args);
        }
      }
    }
  }) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
  globalForPrisma.prismaGuarded = prisma;
}
