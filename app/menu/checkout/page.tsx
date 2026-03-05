"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useCart } from "@/contexts";
import { fetchPublicMenu, createOrder, getApiError } from "@/lib/api";
import type { OrderType } from "@/lib/types";
import { useState } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, ChevronLeft, UtensilsCrossed,
  Truck, ShoppingBag, User, Phone, FileText, ChevronDown, ChevronUp,
} from "lucide-react";

interface CheckoutForm {
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  notes: string;
}

const ORDER_TYPES: { value: OrderType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "dine_in",  label: "Dine in",  icon: <UtensilsCrossed className="h-5 w-5" />, desc: "Eat at the restaurant" },
  { value: "pickup",   label: "Pickup",   icon: <ShoppingBag className="h-5 w-5" />,     desc: "Collect at the counter" },
  { value: "delivery", label: "Delivery", icon: <Truck className="h-5 w-5" />,           desc: "Deliver to your door" },
];

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? undefined;
  const merchantIdParam = searchParams.get("merchantId") ?? "";
  const tableCodeParam = searchParams.get("tableCode") ?? "";

  const { lineItems, clearCart, totalItems, entries } = useCart();
  const [orderResult, setOrderResult] = useState<{
    order_number: string;
    total_price: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

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

  const merchantId = menuData?.merchant_id ?? merchantIdParam;
  const tableCode = menuData?.table_code ?? tableCodeParam;
  const currency = menuData?.menu?.currancy ?? "EGP";

  const subtotal = entries.reduce((sum, entry) => {
    const price = entry.variant ? entry.variant.price : entry.item.base_price;
    const modTotal = entry.selectedModifiers.reduce((s, m) => s + m.modifier.price * m.quantity, 0);
    return sum + (price + modTotal) * entry.quantity;
  }, 0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CheckoutForm>({
    defaultValues: {
      order_type: menuData?.table_id ? "dine_in" : "pickup",
      customer_name: "",
      customer_phone: "",
      notes: "",
    },
  });

  const selectedType = watch("order_type");

  const menuLink = token
    ? `/menu?t=${token}`
    : `/menu?merchantId=${merchantId}&tableCode=${tableCode}`;
  const cartLink = token
    ? `/menu/cart?t=${token}`
    : `/menu/cart?merchantId=${merchantId}&tableCode=${tableCode}`;

  /* ─── Loading ─── */
  if (!merchantId || !menuData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
      </div>
    );
  }

  /* ─── No branch / table context ─── */
  const branchId = menuData.branch_id;
  const hasTableContext = !!menuData.table_id || !!tableCode;
  if (!hasTableContext && !branchId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <UtensilsCrossed className="h-8 w-8 text-amber-500" />
        </div>
        <p className="font-semibold text-gray-900">No branch context</p>
        <p className="mt-1.5 text-sm text-gray-500">
          Open the menu with a table code to place an order.
        </p>
        <Link
          href={menuLink}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  /* ─── Empty cart (without order result) ─── */
  if (totalItems === 0 && !orderResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <ShoppingBag className="h-8 w-8 text-orange-400" />
        </div>
        <p className="font-semibold text-gray-900">Your cart is empty</p>
        <Link
          href={menuLink}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  /* ─── Order placed ─── */
  if (orderResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="w-full max-w-sm rounded-3xl bg-white p-10 shadow-xl">
          {/* Animated check */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-14 w-14 text-green-500" strokeWidth={1.5} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Order placed!</h1>
          <p className="mt-2 text-sm text-gray-500">Your order is being prepared.</p>

          <div className="my-6 rounded-2xl bg-orange-50 px-5 py-4">
            <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">
              Order number
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-orange-500">
              #{orderResult.order_number}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Total:{" "}
            <span className="font-bold text-gray-900">
              {orderResult.total_price.toFixed(2)} {currency}
            </span>
          </p>

          <Link
            href={menuLink}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-white hover:bg-orange-600 transition-colors"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Checkout form ─── */
  const onSubmit = async (form: CheckoutForm) => {
    setSubmitError(null);
    try {
      const res = await createOrder({
        merchant_id: merchantId,
        table_code: tableCode || undefined,
        order_type: form.order_type,
        customer_name: form.customer_name || undefined,
        customer_phone: form.customer_phone || undefined,
        notes: form.notes || undefined,
        items: lineItems,
      });
      setOrderResult({ order_number: res.order_number, total_price: res.total_price });
      clearCart();
    } catch (err) {
      setSubmitError(getApiError(err));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10 pt-[env(safe-area-inset-top)]">

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link
            href={cartLink}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Back to cart"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-gray-900">Checkout</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">

        {/* ─── Order summary (collapsible) ─── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-orange-500" />
              <span className="font-semibold text-gray-900">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
              <span className="text-sm text-gray-400">·</span>
              <span className="font-bold text-orange-500">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
            {summaryOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {summaryOpen && (
            <div className="border-t border-gray-100 px-5 pb-4">
              <ul className="mt-3 space-y-2.5">
                {entries.map((entry, i) => {
                  const price = entry.variant ? entry.variant.price : entry.item.base_price;
                  const modTotal = entry.selectedModifiers.reduce(
                    (s, m) => s + m.modifier.price * m.quantity, 0,
                  );
                  const lineTotal = (price + modTotal) * entry.quantity;
                  return (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-800">
                          {entry.item.name_en || entry.item.name_ar}
                        </span>
                        {entry.variant && (
                          <span className="text-gray-400">
                            {" "}· {entry.variant.name_en || entry.variant.name_ar}
                          </span>
                        )}
                        {entry.selectedModifiers.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            +{" "}
                            {entry.selectedModifiers
                              .map((m) => m.modifier.name_en || m.modifier.name_ar)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-semibold text-gray-900">
                          {lineTotal.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400"> × {entry.quantity}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-orange-500">
                  {subtotal.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Checkout form ─── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </div>
          )}

          {/* Order type selector */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-900">How would you like your order?</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {ORDER_TYPES.map(({ value, label, icon, desc }) => {
                const active = selectedType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("order_type", value)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3.5 text-center transition-all ${
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    {icon}
                    <span className="text-xs font-bold">{label}</span>
                    <span className={`text-[10px] leading-tight ${active ? "text-orange-500" : "text-gray-400"}`}>
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register("order_type", { required: true })} />
          </div>

          {/* Contact info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-900">Your details</h2>
            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  Name <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                  {...register("customer_name")}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Phone className="h-3.5 w-3.5" />
                  Phone <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 01012345678"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                  {...register("customer_phone")}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <FileText className="h-3.5 w-3.5" />
                  Notes <span className="text-gray-300">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Any special requests or allergies?"
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          {/* Total + submit */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {subtotal.toFixed(2)}{" "}
                <span className="text-sm font-medium text-gray-400">{currency}</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Placing order…
                </>
              ) : (
                <>
                  Place order · {subtotal.toFixed(2)} {currency}
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
