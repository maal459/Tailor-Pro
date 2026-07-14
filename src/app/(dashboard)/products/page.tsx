import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { requirePermission } from "@/lib/auth/guards";
import { productRepository, type ProductListFilters } from "@/lib/repositories/product-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";
import {
  createProductAction,
  createProductCategoryAction,
  deleteProductAction,
  deleteProductCategoryAction
} from "@/app/(dashboard)/products/actions";

const PAGE_SIZE = 10;

function stockBadge(quantity: number, minimumStock: number) {
  if (quantity <= 0) return <Badge label="Out of Stock" tone="danger" />;
  if (quantity <= minimumStock) return <Badge label="Low Stock" tone="warn" />;
  return <Badge label="In Stock" tone="success" />;
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; stock?: string; page?: string }>;
}) {
  const session = await requirePermission("products.manage");
  const params = await searchParams;
  const q = params.q?.trim();
  const categoryId = params.categoryId?.trim();
  const stock = params.stock === "low" || params.stock === "out" ? params.stock : undefined;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const filters: ProductListFilters = { query: q, categoryId, stock };

  const [{ rows, total }, categories, suppliers, allProducts] = await Promise.all([
    productRepository.list(session.tenantId, filters, page, PAGE_SIZE),
    productRepository.listCategories(session.tenantId),
    supplierRepository.listAll(session.tenantId),
    prisma.product.findMany({
      where: { tenantId: session.tenantId },
      select: { quantity: true, minimumStock: true }
    })
  ]);

  const lowStockCount = allProducts.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock).length;
  const outOfStockCount = allProducts.filter((p) => p.quantity <= 0).length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("categoryId", categoryId);
    if (stock) sp.set("stock", stock);
    sp.set("page", String(target));
    return `/products?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-[var(--muted)]">Fabric and material inventory</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/purchases"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Purchases
          </Link>
          <Link
            href="/reports/stock"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Stock Report
          </Link>
        </div>
      </div>

      {/* Stock indicators */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Products</p>
          <p className="mt-2 text-2xl font-semibold">{allProducts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Low Stock</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{lowStockCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Out of Stock</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{outOfStockCount}</p>
        </Card>
      </div>

      {/* Add product */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Add Product</p>
        <form className="grid gap-3 md:grid-cols-3" action={createProductAction}>
          <Input name="name" placeholder="Product name *" required />
          <Input name="sku" placeholder="SKU (leave blank to auto-generate)" />
          <Select name="categoryId" defaultValue="" required>
            <option value="">Select category *</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select name="supplierId" defaultValue="">
            <option value="">No supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.supplierName}
              </option>
            ))}
          </Select>
          <Input name="costPrice" type="number" min={0} step="0.01" placeholder="Cost price *" required />
          <Input name="sellingPrice" type="number" min={0} step="0.01" placeholder="Selling price *" required />
          <Input name="quantity" type="number" min={0} placeholder="Initial quantity" defaultValue={0} />
          <Input name="minimumStock" type="number" min={0} placeholder="Minimum stock" defaultValue={5} />
          <Input name="unit" placeholder="Unit (e.g. meter, piece)" />
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--muted)]">Product image (PNG, JPG, or WebP)</label>
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" className="self-end md:w-fit">
            Add Product
          </Button>
        </form>
      </Card>

      {/* Product categories */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Product Categories</p>
        <form className="mb-4 grid gap-3 md:grid-cols-3" action={createProductCategoryAction}>
          <Input name="name" placeholder="Category name *" required />
          <Input name="description" placeholder="Description" />
          <Button variant="secondary" type="submit" className="md:w-fit">
            Add Category
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs"
            >
              {category.name} ({category._count.products})
              <ActionButton
                label="×"
                confirmText={`Delete category "${category.name}"?`}
                action={deleteProductCategoryAction.bind(null, category.id)}
                successMessage="Category deleted"
                className="text-red-500 hover:text-red-700"
              />
            </span>
          ))}
          {!categories.length && (
            <p className="text-sm text-[var(--muted)]">No categories yet. Add one above to create products.</p>
          )}
        </div>
      </Card>

      {/* Search, filters, and list */}
      <Card>
        <form className="mb-4 grid gap-3 md:grid-cols-4" method="get">
          <Input name="q" placeholder="Search name or SKU" defaultValue={q} />
          <Select name="categoryId" defaultValue={categoryId ?? ""}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select name="stock" defaultValue={stock ?? ""}>
            <option value="">All stock levels</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" type="submit">
              Filter
            </Button>
            {(q || categoryId || stock) && (
              <Link
                href="/products"
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
              >
                Clear
              </Link>
            )}
          </div>
        </form>

        <DataTable
          headers={["Product", "SKU", "Category", "Supplier", "Cost", "Price", "Qty", "Status", "Actions"]}
          emptyMessage="No products found."
        >
          {rows.length
            ? rows.map((product) => (
                <tr key={product.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg border border-[var(--border)] object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold uppercase text-[var(--muted)]">
                          {product.name.slice(0, 2)}
                        </div>
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3">{product.category.name}</td>
                  <td className="px-4 py-3">{product.supplier?.supplierName ?? "—"}</td>
                  <td className="px-4 py-3">{formatCurrency(toNumber(product.costPrice))}</td>
                  <td className="px-4 py-3">{formatCurrency(toNumber(product.sellingPrice))}</td>
                  <td className="px-4 py-3 font-semibold">
                    {product.quantity}
                    {product.unit ? ` ${product.unit}` : ""}
                  </td>
                  <td className="px-4 py-3">{stockBadge(product.quantity, product.minimumStock)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                      >
                        Edit
                      </Link>
                      <ActionButton
                        label="Delete"
                        confirmText={`Delete product "${product.name}"?`}
                        action={deleteProductAction.bind(null, product.id)}
                        successMessage="Product deleted"
                        className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                      />
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </DataTable>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p>
            Page {page} of {pageCount} · {total} product{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <a className="rounded-lg border px-3 py-1" href={pageHref(Math.max(1, page - 1))}>
              Prev
            </a>
            <a className="rounded-lg border px-3 py-1" href={pageHref(Math.min(pageCount, page + 1))}>
              Next
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
