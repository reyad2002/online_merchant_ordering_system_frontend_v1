"use client";

import * as React from "react";
import Link from "next/link";
import { useCart } from "@/contexts";
import { createOrder, getApiError } from "@/lib/api";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  cartLink: string;
}

export function CartDrawer({ open, onClose, currency, cartLink }: CartDrawerProps) {
  const { entries, updateQuantity, removeItem, totalItems, lineItems, clearCart } = useCart();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? undefined;

  const [placing, setPlacing] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = React.useState<{ order_number: string } | null>(null);

  const subtotal = entries.reduce((sum, entry) => {
    const price = entry.variant ? entry.variant.price : entry.item.base_price;
    const modTotal = entry.selectedModifiers.reduce(
      (s, m) => s + m.modifier.price * m.quantity,
      0,
    );
    return sum + (price + modTotal) * entry.quantity;
  }, 0);

  const handlePlaceOrder = async () => {
    if (!token || lineItems.length === 0) return;
    setOrderError(null);
    setPlacing(true);
    try {
      const res = await createOrder(token, lineItems);
      setOrderSuccess({ order_number: res.order_number });
      clearCart();
      onClose();
    } catch (err) {
      setOrderError(getApiError(err));
    } finally {
      setPlacing(false);
    }
  };

  const canPlaceOrder = !!token && lineItems.length > 0;

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
              <ShoppingBag className="h-4.5 w-4.5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Your order</h2>
              {totalItems > 0 && (
                <p className="text-xs text-gray-400">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            aria-label="Close cart"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 pb-2">
            {totalItems === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <ShoppingBag className="h-8 w-8 text-gray-300" />
                </div>
                <p className="font-medium text-gray-600">Your cart is empty</p>
                <p className="mt-1 text-sm text-gray-400">Add some items to get started</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {entries.map((entry, index) => {
                  const price = entry.variant ? entry.variant.price : entry.item.base_price;
                  const modTotal = entry.selectedModifiers.reduce(
                    (s, m) => s + m.modifier.price * m.quantity,
                    0,
                  );
                  const lineTotal = (price + modTotal) * entry.quantity;
                  const name = entry.item.name_en || entry.item.name_ar;
                  const variantLabel = entry.variant
                    ? ` · ${entry.variant.name_en || entry.variant.name_ar}`
                    : "";
                  const addOns =
                    entry.selectedModifiers.length > 0
                      ? entry.selectedModifiers
                          .map(
                            (m) =>
                              `${m.modifier.name_en || m.modifier.name_ar}${m.quantity > 1 ? ` ×${m.quantity}` : ""}`,
                          )
                          .join(", ")
                      : null;

                  return (
                    <li
                      key={`${index}-${entry.item.id}-${entry.variant?.id}`}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3"
                    >
                      {/* Item info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 leading-snug">
                          {name}
                          {variantLabel && (
                            <span className="font-normal text-gray-500">{variantLabel}</span>
                          )}
                        </p>
                        {addOns && (
                          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                            + {addOns}
                          </p>
                        )}
                        <p className="mt-1.5 text-sm font-bold text-orange-500">
                          {lineTotal.toFixed(2)}{" "}
                          <span className="text-xs font-medium text-gray-400">{currency}</span>
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, entry.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-gray-900">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, entry.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {totalItems > 0 && (
            <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-3">
              {orderError && (
                <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {orderError}
                </p>
              )}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">
                  {subtotal.toFixed(2)}{" "}
                  <span className="text-sm font-medium text-gray-400">{currency}</span>
                </span>
              </div>

              <button
                type="button"
                disabled={!canPlaceOrder || placing}
                onClick={handlePlaceOrder}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    Place order
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
              {/* <Link
                href={cartLink}
                onClick={onClose}
                className="mt-2 block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                View full cart
              </Link> */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
