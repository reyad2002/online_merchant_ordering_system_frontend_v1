"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchPublicMenu, fetchPublicMenuById, fetchPublicScan, getApiError } from "@/lib/api";
import { useCart } from "@/contexts";
import { Search, ShoppingBag, UtensilsCrossed, MapPin, Hash, ChevronLeft, X } from "lucide-react";
import { MenuItemCard } from "./MenuItemCard";
import { CartDrawer } from "./CartDrawer";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? undefined;
  const menuIdParam = searchParams.get("menuId") ?? undefined;
  const merchantIdParam = searchParams.get("merchantId") ?? "";
  const tableCodeParam = searchParams.get("tableCode") ?? undefined;

  const isTokenFlow = !!token;
  const showScanFirst = isTokenFlow && !menuIdParam;

  const { data: scanData, isLoading: scanLoading, error: scanError } = useQuery({
    queryKey: ["publicScan", token],
    queryFn: () => fetchPublicScan(token!),
    enabled: (showScanFirst || (!!token && !!menuIdParam)) && !!token,
  });

  const { data: menuByIdData, isLoading: menuByIdLoading, error: menuByIdError } = useQuery({
    queryKey: ["publicMenuById", token, menuIdParam],
    queryFn: () => fetchPublicMenuById(menuIdParam!, token!),
    enabled: isTokenFlow && !!menuIdParam && !!token,
  });

  const { data: legacyMenuData, isLoading: legacyLoading, error: legacyError } = useQuery({
    queryKey: ["publicMenu", merchantIdParam, tableCodeParam],
    queryFn: () => fetchPublicMenu(merchantIdParam, tableCodeParam),
    enabled: !isTokenFlow && !!merchantIdParam,
  });

  const data = React.useMemo(() => {
    if (isTokenFlow && menuIdParam && scanData && menuByIdData) {
      return {
        merchant_id: String(scanData.merchant_id),
        branch_id: scanData.branch_id != null ? String(scanData.branch_id) : null,
        table_id: scanData.table_id != null ? String(scanData.table_id) : null,
        table_code: scanData.table_code ?? undefined,
        menu: menuByIdData.menu,
        categories: menuByIdData.categories ?? [],
      };
    }
    return legacyMenuData ?? null;
  }, [isTokenFlow, menuIdParam, scanData, menuByIdData, legacyMenuData]);

  const isLoading = showScanFirst
    ? scanLoading
    : isTokenFlow && menuIdParam
      ? scanLoading || menuByIdLoading
      : legacyLoading;
  const error = showScanFirst
    ? scanError
    : isTokenFlow && menuIdParam
      ? scanError || menuByIdError
      : legacyError;

  const { totalItems } = useCart();
  const [query, setQuery] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [cartOpen, setCartOpen] = React.useState(false);
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});

  /* ─── No link ─── */
  if (!token && !merchantIdParam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <UtensilsCrossed className="h-10 w-10 text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">No menu found</h1>
        <p className="mt-2 text-sm text-gray-500">
          Open via a menu link or scan the table QR code.
        </p>
      </div>
    );
  }

  /* ─── Scan picker ─── */
  if (showScanFirst) {
    if (scanLoading) return <FullPageSpinner />;
    if (scanError || !scanData) {
      return (
        <ErrorScreen
          message={scanError ? getApiError(scanError) : "Failed to load scan"}
          hint="Please scan the table QR again."
        />
      );
    }
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero band */}
        <div className="bg-orange-500 px-6 pb-10 pt-16 text-white">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center gap-4">
              {scanData.merchant_logo ? (
                <img
                  src={scanData.merchant_logo}
                  alt={scanData.merchant_name ?? ""}
                  className="h-16 w-16 rounded-2xl border-2 border-white/30 object-cover shadow"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                  <UtensilsCrossed className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{scanData.merchant_name ?? "Menu"}</h1>
                {scanData.branch_name && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-orange-100">
                    <MapPin className="h-3.5 w-3.5" />
                    {scanData.branch_name}
                  </p>
                )}
                {scanData.table_name != null && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Hash className="h-3.5 w-3.5" />
                    Table {scanData.table_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Menu picker card */}
        <div className="mx-auto max-w-lg px-4 -mt-5">
          <div className="rounded-3xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">
              Choose a menu
            </h2>
            {(scanData.menus ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                No menus available.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {(scanData.menus ?? []).map((menu) => (
                  <li key={String(menu.id)}>
                    <Link
                      href={`/menu?t=${encodeURIComponent(token!)}&menuId=${menu.id}`}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-semibold text-gray-900 transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                    >
                      {menu.name_en || menu.name_ar || `Menu ${menu.id}`}
                      <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) return <FullPageSpinner />;
  if (error || !data) {
    return (
      <ErrorScreen
        message={error ? getApiError(error) : "Failed to load menu"}
        backHref={token ? `/menu?t=${encodeURIComponent(token)}` : undefined}
        backLabel="← Back to menu selection"
      />
    );
  }

  /* ─── Main menu view ─── */
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
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cartHref = token
    ? `/menu/cart?t=${token}`
    : `/menu/cart?merchantId=${data.merchant_id}&tableCode=${tableCodeParam ?? ""}`;
  const checkoutHref = token
    ? `/menu/checkout?t=${token}`
    : `/menu/checkout?merchantId=${data.merchant_id}&tableCode=${tableCodeParam ?? ""}`;
  const backToMenusHref = token ? `/menu?t=${encodeURIComponent(token)}` : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top)]">

      {/* ─── Sticky header ─── */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl">

          {/* Top bar: back link + title + cart */}
          <div className="flex items-center gap-3 px-4 py-3">
            {backToMenusHref && (
              <Link
                href={backToMenusHref}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="All menus"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-gray-900">
                {menu.name_en || menu.name_ar}
              </h1>
              {data.table_code && (
                <p className="flex items-center gap-1 text-xs text-gray-400">
                  <Hash className="h-3 w-3" /> Table {data.table_code}
                </p>
              )}
            </div>

            {/* Cart button */}
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

          {/* Search bar */}
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

          {/* Category chip tabs */}
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

      {/* ─── Content ─── */}
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
                      merchantId={data.merchant_id}
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

      {/* ─── Floating cart bar ─── */}
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
        checkoutLink={checkoutHref}
      />
    </div>
  );
}

/* ─── Shared small components ─── */
function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
    </div>
  );
}

function ErrorScreen({
  message,
  hint,
  backHref,
  backLabel,
}: {
  message: string;
  hint?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <UtensilsCrossed className="h-8 w-8 text-red-400" />
      </div>
      <p className="font-semibold text-gray-900">{message}</p>
      {hint && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
      {backHref && (
        <Link
          href={backHref}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel ?? "Go back"}
        </Link>
      )}
    </div>
  );
}
