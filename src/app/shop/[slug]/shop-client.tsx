"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { placeOnlineOrderAction } from "@/app/shop/[slug]/actions";

export type ShopProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  unit: string | null;
  category: string;
  maxQuantity: number;
};

type CartLine = { id: string; name: string; price: number; unit: string | null; maxQuantity: number; quantity: number };

const cartKey = (slug: string) => `tailor-shop-cart:${slug}`;

function loadCart(slug: string): CartLine[] {
  try {
    const raw = window.localStorage.getItem(cartKey(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ShopClient({ slug, products }: { slug: string; products: ShopProduct[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ orderNumber: string; total: number } | null>(null);
  const [pending, startTransition] = useTransition();

  // The cart lives in the browser so it survives searching, paging and reloads. It is
  // read after mount (not in useState) so the server and first client render match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(loadCart(slug));
    setLoaded(true);
  }, [slug]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(cartKey(slug), JSON.stringify(cart));
    } catch {
      // storage unavailable (private mode) — the cart still works for this visit
    }
  }, [cart, loaded, slug]);

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.price * line.quantity, 0), [cart]);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function addToCart(product: ShopProduct) {
    setPlaced(null);
    setError(null);
    setCart((prev) => {
      const existing = prev.find((line) => line.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.maxQuantity) } : line
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          maxQuantity: product.maxQuantity,
          quantity: 1
        }
      ];
    });
  }

  function setQuantity(id: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.id === id ? { ...line, quantity: Math.min(quantity, line.maxQuantity) } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  function submit(formData: FormData) {
    setError(null);
    const payload = {
      customerName: String(formData.get("customerName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      website: String(formData.get("website") ?? ""),
      items: cart.map((line) => ({ productId: line.id, quantity: line.quantity }))
    };

    startTransition(async () => {
      try {
        const result = await placeOnlineOrderAction(slug, payload);
        if (result.ok) {
          setPlaced({ orderNumber: result.orderNumber, total: result.total });
          setCart([]);
        } else {
          setError(result.error);
          const unavailable = result.unavailableProductIds;
          if (unavailable?.length) setCart((prev) => prev.filter((line) => !unavailable.includes(line.id)));
        }
      } catch {
        setError("Could not place your order. Please check your connection and try again.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-12 text-center text-sm text-[var(--muted)]">
            No products found.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const inCart = cart.find((line) => line.id === product.id)?.quantity ?? 0;
              const soldOut = product.maxQuantity <= 0;
              return (
                <div
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
                >
                  <div className="aspect-[4/3] bg-[var(--bg)]">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--muted)]">
                        <ShoppingBag className="h-10 w-10 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{product.category}</p>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm">
                      <span className="font-semibold">{formatCurrency(product.price)}</span>
                      {product.unit && <span className="text-[var(--muted)]"> / {product.unit}</span>}
                    </p>
                    <div className="mt-auto pt-2">
                      <Button
                        type="button"
                        className="w-full"
                        disabled={soldOut || inCart >= product.maxQuantity}
                        onClick={() => addToCart(product)}
                      >
                        {soldOut
                          ? "Out of stock"
                          : inCart >= product.maxQuantity
                            ? `All ${inCart} in cart`
                            : inCart > 0
                              ? `Add another (${inCart} in cart)`
                              : "Add to cart"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {placed && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Thank you, your order has been received.</p>
            <p className="mt-1">
              Order number <span className="font-mono font-semibold">{placed.orderNumber}</span> · Total{" "}
              {formatCurrency(placed.total)}
            </p>
            <p className="mt-1">We will contact you on the phone number you gave to confirm it.</p>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-4 w-4" /> Your cart ({itemCount})
          </p>

          {cart.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Your cart is empty. Add products to place an order.</p>
          ) : (
            <ul className="space-y-3">
              {cart.map((line) => (
                <li key={line.id} className="flex items-center gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatCurrency(line.price)}
                      {line.unit ? ` / ${line.unit}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="rounded-lg border border-[var(--border)] p-1 hover:bg-black/5"
                    onClick={() => setQuantity(line.id, line.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="rounded-lg border border-[var(--border)] p-1 hover:bg-black/5 disabled:opacity-40"
                    disabled={line.quantity >= line.maxQuantity}
                    onClick={() => setQuantity(line.id, line.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                    onClick={() => setQuantity(line.id, 0)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-3 text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {cart.length > 0 && (
          <form action={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="font-semibold">Your details</p>
            <Input name="customerName" placeholder="Full name *" required minLength={2} maxLength={150} />
            <Input name="phone" type="tel" placeholder="Phone number *" required minLength={5} maxLength={30} />
            <Input name="email" type="email" placeholder="Email (optional)" maxLength={190} />
            <Input name="address" placeholder="Delivery address (optional)" maxLength={255} />
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Notes for the shop (optional)"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
            {/* Honeypot for bots; hidden from people and assistive tech. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Placing order..." : `Place order · ${formatCurrency(total)}`}
            </Button>
          </form>
        )}
      </aside>
    </div>
  );
}
