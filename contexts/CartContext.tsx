"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CartLineItem, PublicMenuItem, PublicMenuVariant, PublicMenuModifier } from "@/lib/types";

export interface CartEntry {
  item: PublicMenuItem;
  variant: PublicMenuVariant | null;
  quantity: number;
  selectedModifiers: Array<{ modifier: PublicMenuModifier; quantity: number }>;
}

function toCartLineItem(entry: CartEntry): CartLineItem {
  return {
    item_id: entry.item.id,
    variant_id: entry.variant?.id ?? null,
    quantity: entry.quantity,
    modifiers: entry.selectedModifiers.map((m) => ({
      modifier_id: m.modifier.id,
      quantity: m.quantity,
    })),
  };
}

interface CartContextValue {
  entries: CartEntry[];
  addItem: (entry: Omit<CartEntry, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  lineItems: CartLineItem[];
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Cart is state-only (in-memory); no localStorage or API. Clears on refresh. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);

  const addItem = useCallback(
    (entry: Omit<CartEntry, "quantity"> & { quantity?: number }) => {
      const qty = entry.quantity ?? 1;
      setEntries((prev) => {
        const key = (e: CartEntry) =>
          `${e.item.id}-${e.variant?.id ?? "base"}-${JSON.stringify(e.selectedModifiers.map((m) => ({ id: m.modifier.id, q: m.quantity })))}`;
        const newEntry: CartEntry = { ...entry, quantity: qty };
        const k = key(newEntry);
        const idx = prev.findIndex((e) => key(e) === k);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
          return next;
        }
        return [...prev, newEntry];
      });
    },
    []
  );

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setEntries((prev) => {
      if (quantity <= 0) return prev.filter((_, i) => i !== index);
      const next = [...prev];
      next[index] = { ...next[index], quantity };
      return next;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setEntries([]), []);

  const lineItems = useMemo(
    () => entries.map(toCartLineItem),
    [entries]
  );

  const totalItems = useMemo(
    () => entries.reduce((s, e) => s + e.quantity, 0),
    [entries]
  );

  const value: CartContextValue = useMemo(
    () => ({
      entries,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      lineItems,
      totalItems,
    }),
    [entries, addItem, updateQuantity, removeItem, clearCart, lineItems, totalItems]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
