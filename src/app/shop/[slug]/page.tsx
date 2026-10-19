import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { getBusinessSettings } from "@/lib/settings";
import { toNumber } from "@/lib/utils";
import { ShopClient, type ShopProduct } from "@/app/shop/[slug]/shop-client";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getT } from "@/lib/i18n/server";

const PAGE_SIZE = 24;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ q?: string; category?: string; page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { title: "Shop not found" };
  const settings = await getBusinessSettings(tenant.id);
  return { title: `${settings.businessName} · Online Shop` };
}

function Unavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-md space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{message}</p>
      </div>
    </div>
  );
}

/**
 * Public storefront for one tenant, reachable without logging in at /shop/[tenant slug].
 * Only customer-safe product fields (name, price, image, unit, availability) are loaded;
 * cost prices, suppliers and exact stock counts never leave the server.
 */
export default async function ShopPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const t = await getT();

  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const settings = await getBusinessSettings(tenant.id);
  if (tenant.status !== "ACTIVE" || !settings.onlineShopEnabled) {
    return (
      <Unavailable
        title={settings.businessName}
        message={t("This shop is not accepting online orders right now. Please contact us directly.")}
      />
    );
  }

  const q = sp.q?.trim() || undefined;
  const categoryId = sp.category?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const where = {
    tenantId: tenant.id,
    categoryId,
    name: q ? { contains: q } : undefined
  };

  const [rows, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        imageUrl: true,
        unit: true,
        quantity: true,
        category: { select: { name: true } }
      },
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.product.count({ where }),
    prisma.productCategory.findMany({
      where: { tenantId: tenant.id, products: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const products: ShopProduct[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: toNumber(row.sellingPrice),
    imageUrl: row.imageUrl || null,
    unit: row.unit || null,
    category: row.category.name,
    // Cap what the browser learns about stock: enough to limit the cart, not an inventory count.
    maxQuantity: Math.max(0, Math.min(row.quantity, 99))
  }));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (categoryId) next.set("category", categoryId);
    next.set("page", String(target));
    return `/shop/${slug}?${next.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]" style={{ ["--primary"]: settings.brandColor } as React.CSSProperties}>
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          {settings.logoDataUrl ? (
            <img src={settings.logoDataUrl} alt={settings.businessName} className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold uppercase text-white">
              {settings.businessName.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{settings.businessName}</h1>
            <p className="truncate text-sm text-[var(--muted)]">{settings.receiptSubtitle}</p>
          </div>
          <div className="ml-auto shrink-0">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Form action={`/shop/${slug}`} className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("Search products")}
            className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          />
          <select
            name="category"
            defaultValue={categoryId ?? ""}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">{t("All categories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:opacity-90">
            {t("Search")}
          </button>
        </Form>

        <ShopClient slug={slug} products={products} />

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 hover:bg-black/5">
                {t("Previous")}
              </Link>
            )}
            <span className="text-[var(--muted)]">
              {t("Page {page} of {pages}", { page, pages: pageCount })}
            </span>
            {page < pageCount && (
              <Link href={pageHref(page + 1)} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 hover:bg-black/5">
                {t("Next")}
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
