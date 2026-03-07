"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchPublicMenuById, getApiError } from "@/lib/api";
import { useCart } from "@/contexts";
import { Search, ShoppingBag, Hash, ChevronLeft, X } from "lucide-react";
import { MenuItemCard } from "../MenuItemCard";
import { CartDrawer } from "../CartDrawer";

export default function MenuByIdPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const token = searchParams.get("t") ?? undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicMenuById", token, id],
    queryFn: () => fetchPublicMenuById(id!, token!),
    enabled: !!id && !!token,
  });

  const { totalItems } = useCart();
  const [query, setQuery] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [cartOpen, setCartOpen] = React.useState(false);
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});

  if (!id || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <p className="font-semibold text-gray-900">Missing menu or token.</p>
        <Link
          href="/menu"
          className="mt-4 text-sm text-orange-600 hover:underline"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <p className="font-semibold text-gray-900">
          {error ? getApiError(error) : "Failed to load menu"}
        </p>
        <Link
          href={`/menu?t=${encodeURIComponent(token)}`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to menu selection
        </Link>
      </div>
    );
  }

  const { menu, categories = [], merchant_id, branch_id, table_id, table_code } = data;
  const merchantId = merchant_id != null ? String(merchant_id) : "";
  const branchId = branch_id != null ? String(branch_id) : null;
  const tableId = table_id != null ? String(table_id) : null;

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
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const backHref = `/menu?t=${encodeURIComponent(token)}`;
  const cartHref = `/menu/cart?t=${encodeURIComponent(token)}&menuId=${id}`;
  const checkoutHref = `/menu/checkout?t=${encodeURIComponent(token)}&menuId=${id}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href={backHref}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="All menus"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-gray-900">
                {menu.name_en || menu.name_ar}
              </h1>
              {table_code && (
                <p className="flex items-center gap-1 text-xs text-gray-400">
                  <Hash className="h-3 w-3" /> Table {table_code}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {catTabs.length > 0 && (
            <div className="overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {catTabs.map((t) => {
                  const active = t.id === effectiveActiveId && !normalizedQuery;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setQuery("");
                        scrollToCategory(t.id);
                      }}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-orange-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

      <main className="mx-auto max-w-2xl px-4 py-5">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Search className="mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">No dishes found</p>
            <p className="mt-1 text-sm text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((cat) => (
              <section
                key={cat.id}
                ref={(el) => { sectionRefs.current[cat.id] = el; }}
                className="scroll-mt-44"
              >
                <h2 className="mb-3 text-base font-bold text-gray-900 after:mt-1 after:block after:h-0.5 after:w-8 after:rounded-full after:bg-orange-400 after:content-['']">
                  {cat.name_en || cat.name_ar}
                </h2>
                <div className="space-y-3">
                  {(cat.items ?? []).map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      currency={menu.currancy}
                      merchantId={merchantId}
                      branchId={branchId}
                      tableId={tableId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl bg-orange-500 px-5 py-4 text-white shadow-lg hover:bg-orange-600 transition-colors"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm font-bold">
              {totalItems}
            </span>
            <span className="font-semibold">View cart</span>
            <ShoppingBag className="h-5 w-5 opacity-80" />
          </button>
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        currency={menu.currancy}
        cartLink={cartHref}
      />
    </div>
  );
}
