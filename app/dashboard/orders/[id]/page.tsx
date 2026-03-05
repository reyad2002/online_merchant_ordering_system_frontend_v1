"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchOrder, updateOrderStatus, getApiError } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";
import {
  ArrowLeft, Loader2, Check, ChefHat, X,
  ClipboardList, User, Phone, StickyNote, Hash,
  CheckCircle2, Clock,
} from "lucide-react";
import Link from "next/link";

const statusLabels: Record<OrderStatus, string> = {
  draft:      "Draft",
  placed:     "Placed",
  accepted:   "Accepted",
  preparing:  "Preparing",
  ready:      "Ready",
  completed:  "Completed",
  cancelled:  "Cancelled",
};

const statusBadge: Record<OrderStatus, string> = {
  draft:      "badge badge-neutral",
  placed:     "badge badge-info",
  accepted:   "badge badge-teal",
  preparing:  "badge badge-warning",
  ready:      "badge bg-blue-100 text-blue-700",
  completed:  "badge badge-success",
  cancelled:  "badge badge-error",
};

/* ─── Status progress steps ─── */
const STATUS_STEPS: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "completed"];

function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "draft") return null;
  const current = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {STATUS_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex min-w-0 flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done    ? "bg-teal-600 text-white"
                : active ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500"
                : "bg-slate-100 text-slate-400"
              }`}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-[10px] font-medium sm:block ${active ? "text-teal-700" : done ? "text-slate-600" : "text-slate-400"}`}>
                {statusLabels[s]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 transition-colors ${done ? "bg-teal-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  });

  const updateStatus = useMutation({
    mutationFn: ({ status }: { status: OrderStatus }) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (isLoading || !order) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );

  if (error) return <div className="alert-error">{getApiError(error)}</div>;

  const canUpdate = order.status !== "completed" && order.status !== "cancelled";

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {/* Header card */}
      <div className="card px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100">
              <ClipboardList className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Order #{order.order_number}</h1>
                <span className={statusBadge[order.status]}>{statusLabels[order.status]}</span>
                {order.order_type && (
                  <span className="badge badge-neutral capitalize">{order.order_type.replace("_", " ")}</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          {/* Total */}
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{order.total_price.toFixed(2)}</p>
            <p className="text-sm text-slate-500">EGP total</p>
          </div>
        </div>

        {/* Status stepper */}
        {order.status !== "cancelled" && order.status !== "draft" && (
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <StatusStepper status={order.status} />
          </div>
        )}
        {order.status === "cancelled" && (
          <div className="mt-4 alert-error flex items-center gap-2">
            <X className="h-4 w-4 shrink-0" /> This order has been cancelled.
          </div>
        )}
      </div>

      {/* Info grid */}
      {(order.customer_name || order.customer_phone || order.notes) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {order.customer_name && (
            <div className="stat-card flex items-start gap-3">
              <User className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Customer</p>
                <p className="font-medium text-slate-800">{order.customer_name}</p>
              </div>
            </div>
          )}
          {order.customer_phone && (
            <div className="stat-card flex items-start gap-3">
              <Phone className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Phone</p>
                <p className="font-medium text-slate-800">{order.customer_phone}</p>
              </div>
            </div>
          )}
          {order.notes && (
            <div className="stat-card flex items-start gap-3 sm:col-span-1">
              <StickyNote className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Notes</p>
                <p className="text-slate-700">{order.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items card */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <Hash className="h-4 w-4 text-slate-400" />
          <h2 className="section-title text-sm">Order items</h2>
          <span className="badge badge-neutral">{order.items?.length ?? 0}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="hidden sm:table-cell">Qty</th>
              <th className="text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>
                  <p className="font-medium text-slate-800">{item.name_snapshot}</p>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {item.modifiers.map((m) => (
                        <li key={m.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          {m.name_snapshot}
                          <span className="text-slate-400">+{m.price.toFixed(2)} EGP</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="hidden sm:table-cell text-slate-500">×{item.quantity}</td>
                <td className="text-right font-semibold text-slate-800">{item.total_price.toFixed(2)} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Total row */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="font-semibold text-slate-700">Total</span>
          <span className="text-lg font-bold text-slate-900">{order.total_price.toFixed(2)} EGP</span>
        </div>
      </div>

      {/* Action buttons */}
      {canUpdate && (
        <div className="card px-5 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-600">Update order status</p>
          <div className="flex flex-wrap gap-2">
            {order.status === "placed" && (
              <button type="button" onClick={() => updateStatus.mutate({ status: "accepted" })} disabled={updateStatus.isPending}
                className="btn-primary">
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept order
              </button>
            )}
            {order.status === "accepted" && (
              <button type="button" onClick={() => updateStatus.mutate({ status: "preparing" })} disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                <ChefHat className="h-4 w-4" />
                Start preparing
              </button>
            )}
            {order.status === "preparing" && (
              <button type="button" onClick={() => updateStatus.mutate({ status: "ready" })} disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                Mark ready
              </button>
            )}
            {order.status === "ready" && (
              <button type="button" onClick={() => updateStatus.mutate({ status: "completed" })} disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </button>
            )}
            {["placed", "accepted", "preparing"].includes(order.status) && (
              <button type="button" onClick={() => updateStatus.mutate({ status: "cancelled" })} disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                <X className="h-4 w-4" />
                Cancel order
              </button>
            )}
          </div>
        </div>
      )}

      {order.status === "completed" && (
        <div className="alert-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Order completed successfully.
        </div>
      )}
    </div>
  );
}
