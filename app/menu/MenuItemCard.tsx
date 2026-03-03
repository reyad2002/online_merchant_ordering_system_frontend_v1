"use client";

import * as React from "react";
import { Plus, Minus, Check, X } from "lucide-react";
import { useCart } from "@/contexts";
import type {
  PublicMenuItem,
  PublicMenuVariant,
  PublicMenuModifierGroupRule,
  PublicMenuModifier,
} from "@/lib/types";

interface MenuItemCardProps {
  item: PublicMenuItem;
  currency: string;
  merchantId: string;
  branchId: string | null;
  tableId: string | null;
}

export function MenuItemCard({ item, currency }: MenuItemCardProps) {
  const { addItem } = useCart();

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [variant, setVariant] = React.useState<PublicMenuVariant | null>(
    item.variants?.[0] ?? null,
  );
  const [quantity, setQuantity] = React.useState(1);

  const [modifierSelections, setModifierSelections] = React.useState<
    Record<string, { modifier: PublicMenuModifier; qty: number }[]>
  >({});

  const groups = item.modifier_groups ?? [];
  const displayName = item.name_en || item.name_ar || "Item";
  const nameAr = item.name_ar;
  const nameEn = item.name_en;

  const basePrice = variant ? variant.price : item.base_price;

  const selectedCountForGroup = (groupId: string) =>
    (modifierSelections[groupId] ?? []).reduce((s, x) => s + x.qty, 0);

  const isModifierSelected = (groupId: string, modId: string) =>
    (modifierSelections[groupId] ?? []).some(
      (x) => String(x.modifier.id) === String(modId),
    );

  const toggleModifier = (
    group: PublicMenuModifierGroupRule,
    mod: PublicMenuModifier,
  ) => {
    const key = String(group.group.id);
    const list = modifierSelections[key] ?? [];
    const idx = list.findIndex((x) => String(x.modifier.id) === String(mod.id));
    const max = group.rule.max_select;

    let next: { modifier: PublicMenuModifier; qty: number }[];

    if (idx >= 0) {
      // remove
      next = list.filter((_, i) => i !== idx);
    } else {
      const total = list.reduce((s, x) => s + x.qty, 0);
      if (total >= max) return;
      next = [...list, { modifier: mod, qty: 1 }];
    }

    setModifierSelections((prev) => ({ ...prev, [key]: next }));
  };

  const bumpModifierQty = (
    group: PublicMenuModifierGroupRule,
    mod: PublicMenuModifier,
    delta: number,
  ) => {
    const key = String(group.group.id);
    const list = modifierSelections[key] ?? [];
    const idx = list.findIndex((x) => String(x.modifier.id) === String(mod.id));
    const max = group.rule.max_select;

    if (idx < 0) return;

    const currentTotal = list.reduce((s, x) => s + x.qty, 0);
    const nextList = [...list];
    const nextQty = nextList[idx].qty + delta;

    if (nextQty <= 0) {
      nextList.splice(idx, 1);
    } else {
      // if increasing, respect group max total qty
      if (delta > 0 && currentTotal >= max) return;
      nextList[idx] = { ...nextList[idx], qty: nextQty };
    }

    setModifierSelections((prev) => ({ ...prev, [key]: nextList }));
  };

  const valid = groups.every((g) => {
    const selected = modifierSelections[String(g.group.id)] ?? [];
    const count = selected.reduce((s, x) => s + x.qty, 0);
    return count >= g.rule.min_select && count <= g.rule.max_select;
  });

  const firstInvalid = groups.find((g) => {
    const count = selectedCountForGroup(String(g.group.id));
    return count < g.rule.min_select || count > g.rule.max_select;
  });

  const resetState = () => {
    setVariant(item.variants?.[0] ?? null);
    setQuantity(1);
    setModifierSelections({});
  };

  const modifiersUnitTotal = React.useMemo(() => {
    let sum = 0;
    for (const g of groups) {
      const gid = String(g.group.id);
      for (const s of modifierSelections[gid] ?? []) {
        sum += (s.modifier.price || 0) * s.qty;
      }
    }
    return sum;
  }, [groups, modifierSelections]);

  const unitTotal = basePrice + modifiersUnitTotal;
  const total = unitTotal * quantity;

  const handleAdd = () => {
    const selectedModifiers = groups.flatMap((g) =>
      (modifierSelections[String(g.group.id)] ?? []).map((s) => ({
        modifier: s.modifier,
        quantity: s.qty,
      })),
    );

    addItem({
      item,
      variant: variant ?? null,
      quantity,
      selectedModifiers,
    });

    setDetailsOpen(false);
    resetState();
  };

  /** Quick order: add with default variant and min required modifiers (or none) */
  const handleQuickOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultVariant = item.variants?.[0] ?? null;

    const defaultModifiers: Array<{
      modifier: PublicMenuModifier;
      quantity: number;
    }> = [];

    for (const g of groups) {
      const min = g.rule.min_select;
      for (let i = 0; i < min && g.modifiers[i]; i++) {
        defaultModifiers.push({ modifier: g.modifiers[i], quantity: 1 });
      }
    }

    addItem({
      item,
      variant: defaultVariant,
      quantity: 1,
      selectedModifiers: defaultModifiers,
    });
  };

  const canQuickOrder = groups.every((g) => g.rule.min_select === 0);

  return (
    <>
      {/* Talabat/8 Orders style – white card, image placeholder, Add */}
      <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-400">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {nameEn && nameAr ? (
              <>
                {nameEn}
                <span className="text-gray-500 font-normal"> · {nameAr}</span>
              </>
            ) : (
              displayName
            )}
          </p>
          <p className="text-sm font-bold text-orange-500 mt-0.5">
            {basePrice.toFixed(2)} {currency}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="h-9 shrink-0 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98]"
        >
          Add
        </button>
      </div>

      {/* Details modal – white bottom sheet (Talabat style) */}
      {detailsOpen && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
    onClick={() => {
      setDetailsOpen(false);
      resetState();
    }}
  >
    <div
      className="relative w-full max-w-xl rounded-t-3xl bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header (small) */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-zinc-900">
            {displayName}
          </p>
          <p className="text-xs font-bold text-orange-500">
            {unitTotal.toFixed(2)} {currency}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDetailsOpen(false);
            resetState();
          }}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body (simple) */}
      <div className="max-h-[62vh] overflow-y-auto px-4 py-4 pb-24">
        {firstInvalid ? (
          <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
            Choose {firstInvalid.group.name_en || firstInvalid.group.name_ar} (
            {firstInvalid.rule.min_select}–{firstInvalid.rule.max_select})
          </div>
        ) : null}

        {/* Variants as chips */}
        {item.variants && item.variants.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Variants
            </p>
            <div className="flex flex-wrap gap-2">
              {item.variants.map((v) => {
                const active = String(variant?.id) === String(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariant(v)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    {v.name_en || v.name_ar} • {v.price.toFixed(2)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modifiers as chips (tap select/unselect) */}
        {groups.map((g) => {
          const gid = String(g.group.id);
          const count = selectedCountForGroup(gid);
          const min = g.rule.min_select;
          const max = g.rule.max_select;

          return (
            <div key={gid} className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  {g.group.name_en || g.group.name_ar} ({min}–{max})
                </p>
                <span className="text-[11px] font-extrabold text-zinc-500">
                  {count}/{max}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {g.modifiers.map((m) => {
                  const selected = isModifierSelected(gid, String(m.id));
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModifier(g, m)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                        selected
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-gray-200 bg-white text-gray-800"
                      }`}
                    >
                      {m.name_en || m.name_ar}
                      {m.price > 0 ? ` +${m.price.toFixed(2)}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar (compact) */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center overflow-hidden rounded-xl border border-zinc-200">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center text-zinc-700 hover:bg-zinc-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-extrabold text-zinc-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="flex h-9 w-9 items-center justify-center text-zinc-700 hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Total
            </p>
            <p className="text-sm font-bold text-orange-500">
              {total.toFixed(2)} {currency}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!valid}
            className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </>
  );
}
