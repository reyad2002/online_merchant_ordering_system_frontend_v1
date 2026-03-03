"use client";

import * as React from "react";
import Link from "next/link";
import { useCart } from "@/contexts";
import { X, Minus, Plus, Trash2, ChevronRight } from "lucide-react";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  cartLink: string;
  checkoutLink: string;
}

export function CartDrawer({
  open,
  onClose,
  currency,
  cartLink,
  checkoutLink,
}: CartDrawerProps) {
  const { entries, updateQuantity, removeItem, totalItems } = useCart();

  const subtotal = entries.reduce((sum, entry) => {
    const price = entry.variant ? entry.variant.price : entry.item.base_price;
    const modTotal = entry.selectedModifiers.reduce(
      (s, m) => s + m.modifier.price * m.quantity,
      0
    );
    return sum + (price + modTotal) * entry.quantity;
  }, 0);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-lg font-bold text-gray-900">Your order</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {totalItems === 0 ? (
              <p className="py-8 text-center text-gray-500">Your cart is empty</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry, index) => {
                  const price = entry.variant
                    ? entry.variant.price
                    : entry.item.base_price;
                  const modTotal = entry.selectedModifiers.reduce(
                    (s, m) => s + m.modifier.price * m.quantity,
                    0
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
                              `${m.modifier.name_en || m.modifier.name_ar}${m.quantity > 1 ? ` ×${m.quantity}` : ""}`
                          )
                          .join(", ")
                      : null;

                  return (
                    <li
                      key={`${index}-${entry.item.id}-${entry.variant?.id}`}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {name}
                            {variantLabel}
                          </p>
                          {addOns && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              + {addOns}
                            </p>
                          )}
                          <p className="mt-1.5 text-sm font-bold text-orange-500">
                            {lineTotal.toFixed(2)} {currency}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(index, entry.quantity - 1)
                              }
                              className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-medium text-gray-900">
                              {entry.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(index, entry.quantity + 1)
                              }
                              className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {totalItems > 0 && (
            <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-orange-500">
                  {subtotal.toFixed(2)} {currency}
                </span>
              </div>
              <Link
                href={checkoutLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 font-semibold text-white hover:bg-orange-600"
                onClick={onClose}
              >
                Proceed to checkout
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                href={cartLink}
                className="mt-2 block text-center text-sm text-gray-500 hover:text-gray-700 underline"
                onClick={onClose}
              >
                View full cart
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
