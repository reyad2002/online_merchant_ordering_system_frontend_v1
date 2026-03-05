"use client";

import * as React from "react";
import { Plus, Minus, X, Check } from "lucide-react";
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

const GRADIENTS = [
  "from-orange-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-teal-400 to-emerald-500",
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-pink-400 to-rose-500",
];

function avatarGradient(name: string) {
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
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
  const grad = avatarGradient(displayName);

  const selectedCountForGroup = (groupId: string) =>
    (modifierSelections[groupId] ?? []).reduce((s, x) => s + x.qty, 0);

  const isModifierSelected = (groupId: string, modId: string) =>
    (modifierSelections[groupId] ?? []).some(
      (x) => String(x.modifier.id) === String(modId),
    );

  const toggleModifier = (g: PublicMenuModifierGroupRule, mod: PublicMenuModifier) => {
    const key = String(g.group.id);
    const list = modifierSelections[key] ?? [];
    const idx = list.findIndex((x) => String(x.modifier.id) === String(mod.id));
    const max = g.rule.max_select;
    let next: typeof list;
    if (idx >= 0) {
      next = list.filter((_, i) => i !== idx);
    } else {
      const total = list.reduce((s, x) => s + x.qty, 0);
      if (total >= max) return;
      next = [...list, { modifier: mod, qty: 1 }];
    }
    setModifierSelections((prev) => ({ ...prev, [key]: next }));
  };

  const bumpModifierQty = (g: PublicMenuModifierGroupRule, mod: PublicMenuModifier, delta: number) => {
    const key = String(g.group.id);
    const list = modifierSelections[key] ?? [];
    const idx = list.findIndex((x) => String(x.modifier.id) === String(mod.id));
    if (idx < 0) return;
    const currentTotal = list.reduce((s, x) => s + x.qty, 0);
    const nextList = [...list];
    const nextQty = nextList[idx].qty + delta;
    if (nextQty <= 0) {
      nextList.splice(idx, 1);
    } else {
      if (delta > 0 && currentTotal >= g.rule.max_select) return;
      nextList[idx] = { ...nextList[idx], qty: nextQty };
    }
    setModifierSelections((prev) => ({ ...prev, [key]: nextList }));
  };

  const valid = groups.every((g) => {
    const count = selectedCountForGroup(String(g.group.id));
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
      for (const s of modifierSelections[String(g.group.id)] ?? []) {
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
    addItem({ item, variant: variant ?? null, quantity, selectedModifiers });
    setDetailsOpen(false);
    resetState();
  };

  return (
    <>
      {/* ─── List card ─── */}
      <div
        className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:border-orange-200 hover:shadow-md active:scale-[0.99]"
        onClick={() => setDetailsOpen(true)}
      >
        {/* Avatar */}
        <div
          className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-linear-to-br ${grad} flex items-center justify-center shadow-sm`}
        >
          <span className="text-3xl font-bold text-white/75 select-none">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-gray-900 line-clamp-2">
            {nameEn && nameAr ? (
              <>
                {nameEn}
                <span className="block text-xs font-normal text-gray-400">{nameAr}</span>
              </>
            ) : (
              displayName
            )}
          </p>
          {groups.length > 0 && (
            <p className="mt-0.5 text-xs text-gray-400">Customisable</p>
          )}
          <p className="mt-1.5 text-sm font-bold text-orange-500">
            {basePrice.toFixed(2)}{" "}
            <span className="text-xs font-medium text-gray-400">{currency}</span>
          </p>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDetailsOpen(true);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-all hover:bg-orange-600 active:scale-90 group-hover:shadow-md"
          aria-label={`Add ${displayName}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* ─── Detail bottom sheet ─── */}
      {detailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setDetailsOpen(false);
            resetState();
          }}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            style={{ maxHeight: "92dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image / banner */}
            <div
              className={`relative h-44 w-full bg-linear-to-br ${grad} flex items-center justify-center`}
            >
              <span className="text-8xl font-bold text-white/60 select-none">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  resetState();
                }}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Item header */}
            <div className="border-b border-gray-100 px-5 pt-4 pb-3">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              {nameAr && nameEn && (
                <p className="text-sm text-gray-400">{nameAr}</p>
              )}
              <p className="mt-1.5 text-lg font-bold text-orange-500">
                {unitTotal.toFixed(2)}{" "}
                <span className="text-sm font-medium text-gray-400">{currency}</span>
              </p>
            </div>

            {/* Scrollable options area */}
            <div
              className="overflow-y-auto px-5 py-4 pb-28"
              style={{ maxHeight: "calc(92dvh - 11rem - 4.5rem)" }}
            >
              {firstInvalid && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                  <span className="text-xs font-semibold text-amber-800">
                    Please choose:{" "}
                    <span className="font-bold">
                      {firstInvalid.group.name_en || firstInvalid.group.name_ar}
                    </span>{" "}
                    ({firstInvalid.rule.min_select}–{firstInvalid.rule.max_select})
                  </span>
                </div>
              )}

              {/* Variants */}
              {item.variants && item.variants.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Size / Variant
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {item.variants.map((v) => {
                      const active = String(variant?.id) === String(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVariant(v)}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                            active
                              ? "border-orange-500 bg-orange-50 font-semibold text-orange-700 shadow-sm"
                              : "border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-200"
                          }`}
                        >
                          <span>{v.name_en || v.name_ar}</span>
                          <span className="font-bold">{v.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifier groups */}
              {groups.map((g) => {
                const gid = String(g.group.id);
                const count = selectedCountForGroup(gid);
                const { min_select: min, max_select: max } = g.rule;
                const isFull = count >= max;

                return (
                  <div key={gid} className="mb-5">
                    <div className="mb-2.5 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          {g.group.name_en || g.group.name_ar}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {min > 0 ? "Required · " : "Optional · "}
                          Pick up to {max}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isFull
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {count}/{max}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {g.modifiers.map((m) => {
                        const selected = isModifierSelected(gid, String(m.id));
                        const sel = (modifierSelections[gid] ?? []).find(
                          (x) => String(x.modifier.id) === String(m.id),
                        );
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleModifier(g, m)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 transition-all ${
                              selected
                                ? "border-orange-300 bg-orange-50"
                                : "border-gray-100 bg-gray-50 hover:border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                                  selected
                                    ? "border-orange-500 bg-orange-500"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-sm text-gray-800">
                                {m.name_en || m.name_ar}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {m.price > 0 && (
                                <span className="text-sm font-semibold text-orange-500">
                                  +{m.price.toFixed(2)}
                                </span>
                              )}
                              {selected && sel && (
                                <div className="flex items-center overflow-hidden rounded-lg border border-orange-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      bumpModifierQty(g, m, -1);
                                    }}
                                    className="flex h-6 w-6 items-center justify-center text-orange-500 hover:bg-orange-50"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-gray-900">
                                    {sel.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      bumpModifierQty(g, m, 1);
                                    }}
                                    className="flex h-6 w-6 items-center justify-center text-orange-500 hover:bg-orange-50"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Bottom action bar ─── */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!valid}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-orange-500 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add to cart &nbsp;·&nbsp; {total.toFixed(2)} {currency}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
