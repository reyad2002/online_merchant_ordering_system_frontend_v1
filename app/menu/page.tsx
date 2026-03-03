"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicMenu } from "@/lib/api";
import { useCart } from "@/contexts";
import { Search, ShoppingCart } from "lucide-react";
import { MenuItemCard } from "./MenuItemCard";
import { CartDrawer } from "./CartDrawer";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const tableCode = searchParams.get("tableCode") ?? undefined;
  const merchantId = searchParams.get("merchantId") ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicMenu", merchantId, tableCode],
    queryFn: () => fetchPublicMenu(merchantId, tableCode),
    enabled: !!merchantId,
  });

  const { totalItems } = useCart();
  const [query, setQuery] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [cartOpen, setCartOpen] = React.useState(false);
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});

  if (!merchantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-center text-gray-600">Open with a menu link (e.g. ?merchantId=...)</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-center text-red-600">{error ? String(error) : "Failed to load menu"}</p>
      </div>
    );
  }

  const { menu, categories = [] } = data;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = normalizedQuery
    ? categories
        .map((c) => ({
          ...c,
          items: (c.items ?? []).filter((it) => {
            const hay = `${it.name_en ?? ""} ${it.name_ar ?? ""}`.toLowerCase();
            return hay.includes(normalizedQuery);
          }),
        }))
        .filter((c) => (c.items ?? []).length > 0)
    : categories;

  const catTabs = categories.map((c) => ({
    id: c.id,
    label: c.name_en || c.name_ar || "Category",
  }));
  const effectiveActiveId = activeCategoryId ?? catTabs[0]?.id ?? null;

  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cartHref = `/menu/cart?merchantId=${merchantId}&tableCode=${tableCode ?? ""}`;
  const checkoutHref = `/menu/checkout?merchantId=${merchantId}&tableCode=${tableCode ?? ""}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-[env(safe-area-inset-top)]">
      {/* Header – Talabat/8 Orders style */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {menu.name_en || menu.name_ar}
            </h1>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
              aria-label="Cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Category chips – horizontal scroll */}
          {catTabs.length > 0 && (
            <div className="mt-3 -mx-4 overflow-x-auto px-4 scrollbar-none">
              <div className="flex gap-2 pb-1">
                {catTabs.map((t) => {
                  const active = t.id === effectiveActiveId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => scrollToCategory(t.id)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-4">
        {filteredCategories.length === 0 ? (
          <p className="py-12 text-center text-gray-500">No items match your search.</p>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((cat) => (
              <section
                key={cat.id}
                ref={(el) => {
                  sectionRefs.current[cat.id] = el;
                }}
                className="scroll-mt-40"
              >
                <h2 className="mb-3 text-base font-bold text-gray-900">
                  {cat.name_en || cat.name_ar}
                </h2>
                <div className="space-y-2">
                  {(cat.items ?? []).map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      currency={menu.currancy}
                      merchantId={merchantId}
                      branchId={data.branch_id}
                      tableId={data.table_id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Bottom bar – View cart (Talabat style) */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-2xl items-center justify-between gap-4 bg-orange-500 px-4 py-4 text-white shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <span className="font-semibold">
          {totalItems > 0 ? `View cart · ${totalItems} item${totalItems !== 1 ? "s" : ""}` : "View cart"}
        </span>
        <ShoppingCart className="h-5 w-5" />
      </button>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        currency={menu.currancy}
        cartLink={cartHref}
        checkoutLink={checkoutHref}
      />
    </div>
  );
}
