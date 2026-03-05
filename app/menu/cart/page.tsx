"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicMenu } from "@/lib/api";
import { useAuth, useCart } from "@/contexts";
import Link from "next/link";
import {
  ShoppingBag, Minus, Plus, Trash2, ChevronLeft, ArrowRight, Tag,
} from "lucide-react";

export default function CartPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? undefined;
  const tableCodeParam = searchParams.get("tableCode") ?? "";
  const merchantIdParam =
    user?.merchant_id != null
      ? String(user.merchant_id)
      : searchParams.get("merchantId") ?? "";

  const { data: menuData } = useQuery({
    queryKey: token
      ? ["publicMenu", "token", token]
      : ["publicMenu", merchantIdParam, tableCodeParam],
    queryFn: () =>
      token
        ? fetchPublicMenu(undefined, undefined, token)
        : fetchPublicMenu(merchantIdParam, tableCodeParam),
    enabled: !!token || !!merchantIdParam,
  });
  const currency = menuData?.menu?.currancy ?? "EGP";

  const { entries, updateQuantity, removeItem, totalItems } = useCart();

  const menuHref = token
    ? `/menu?t=${token}`
    : `/menu?merchantId=${merchantIdParam}&tableCode=${tableCodeParam}`;
  const checkoutHref = token
    ? `/menu/checkout?t=${token}`
    : `/menu/checkout?merchantId=${merchantIdParam}&tableCode=${tableCodeParam}`;

  const subtotal = entries.reduce((sum, entry) => {
    const price = entry.variant ? entry.variant.price : entry.item.base_price;
    const modTotal = entry.selectedModifiers.reduce(
      (s, m) => s + m.modifier.price * m.quantity,
      0,
    );
    return sum + (price + modTotal) * entry.quantity;
  }, 0);

  /* ─── Empty cart ─── */
  if (totalItems === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100">
          <ShoppingBag className="h-12 w-12 text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-gray-500">Add some items from the menu to get started.</p>
        <Link
          href={menuHref}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-40 pt-[env(safe-area-inset-top)]">

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href={menuHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Back to menu"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-gray-900">Your cart</h1>
            <p className="text-xs text-gray-400">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
            <ShoppingBag className="h-4.5 w-4.5 text-orange-600" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">

        {/* ─── Item rows ─── */}
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const price = entry.variant ? entry.variant.price : entry.item.base_price;
            const modTotal = entry.selectedModifiers.reduce(
              (s, m) => s + m.modifier.price * m.quantity,
              0,
            );
            const lineTotal = (price + modTotal) * entry.quantity;
            const name = entry.item.name_en || entry.item.name_ar;
            const variantLabel = entry.variant
              ? `${entry.variant.name_en || entry.variant.name_ar}`
              : null;
            const addOns =
              entry.selectedModifiers.length > 0
                ? entry.selectedModifiers.map(
                    (m) =>
                      `${m.modifier.name_en || m.modifier.name_ar}${m.quantity > 1 ? ` ×${m.quantity}` : ""}`,
                  )
                : null;

            return (
              <div
                key={`${index}-${entry.item.id}-${entry.variant?.id}`}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Item details */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 leading-snug">{name}</p>
                    {variantLabel && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <Tag className="h-3 w-3" />
                        {variantLabel}
                      </p>
                    )}
                    {addOns && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {addOns.map((a, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700"
                          >
                            + {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Bottom row: qty stepper + price */}
                <div className="mt-3.5 flex items-center justify-between">
                  <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => updateQuantity(index, entry.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-gray-900">
                      {entry.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(index, entry.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-base font-bold text-gray-900">
                    {lineTotal.toFixed(2)}{" "}
                    <span className="text-xs font-medium text-gray-400">{currency}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Order summary ─── */}
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-900">Order summary</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>
                Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})
              </span>
              <span className="font-semibold text-gray-900">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-orange-500">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Sticky checkout bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">
              {subtotal.toFixed(2)} {currency}
            </span>
          </div>
          <Link
            href={checkoutHref}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-white hover:bg-orange-600 transition-colors"
          >
            Proceed to checkout
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
