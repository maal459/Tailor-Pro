import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { productRepository } from "@/lib/repositories/product-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { toNumber } from "@/lib/utils";
import { updateProductAction } from "@/app/(dashboard)/products/actions";

export default async function EditProductPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("products.manage");
  const { id } = await params;

  const [product, categories, suppliers] = await Promise.all([
    productRepository.byId(session.tenantId, id),
    productRepository.listCategories(session.tenantId),
    supplierRepository.listAll(session.tenantId)
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Product</h1>
        <p className="text-sm text-[var(--muted)]">
          {product.name} · {product.sku}
        </p>
      </div>

      <Card>
        <form className="space-y-4" action={updateProductAction.bind(null, product.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Product Name *</label>
              <Input name="name" defaultValue={product.name} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">SKU</label>
              <Input name="sku" defaultValue={product.sku} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Category *</label>
              <Select name="categoryId" defaultValue={product.categoryId} required>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Supplier</label>
              <Select name="supplierId" defaultValue={product.supplierId ?? ""}>
                <option value="">No supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.supplierName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Cost Price ($) *</label>
              <Input
                name="costPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={toNumber(product.costPrice)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Selling Price ($) *</label>
              <Input
                name="sellingPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={toNumber(product.sellingPrice)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Quantity *</label>
              <Input name="quantity" type="number" min={0} defaultValue={product.quantity} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Minimum Stock *</label>
              <Input
                name="minimumStock"
                type="number"
                min={0}
                defaultValue={product.minimumStock}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Unit</label>
              <Input name="unit" defaultValue={product.unit ?? ""} placeholder="e.g. meter, piece" />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
            <p className="mb-3 text-sm font-semibold">Product Image</p>
            <div className="flex flex-wrap items-center gap-4">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-20 w-20 rounded-xl border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--muted)]">
                  No image
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  name="image"
                  accept="image/png,image/jpeg,image/webp"
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                />
                {product.imageUrl && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="removeImage" />
                    Remove current image
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Link
              href="/products"
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
