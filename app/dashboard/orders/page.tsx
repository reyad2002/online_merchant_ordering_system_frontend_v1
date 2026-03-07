"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import { fetchOrders, updateOrderStatus, getApiError } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";
import { useOrderCreated } from "@/hooks/useOrderCreated";
import {
  ClipboardList,
  ChevronRight,
  Loader2,
  Check,
  X,
  ChefHat,
  CheckCircle2,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const statusLabels: Record<OrderStatus, string> = {
  draft: "Draft",
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusBadge: Record<OrderStatus, string> = {
  draft: "badge badge-neutral",
  placed: "badge badge-info",
  accepted: "badge badge-teal",
  preparing: "badge badge-warning",
  ready: "badge bg-blue-100 text-blue-700",
  completed: "badge badge-success",
  cancelled: "badge badge-error",
};

export default function DashboardOrdersPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [newOrderToast, setNewOrderToast] = useState<{ order_number: string } | null>(null);
  const queryClient = useQueryClient();

  useOrderCreated(
    (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setNewOrderToast({ order_number: data.order_number });
      setTimeout(() => setNewOrderToast(null), 4000);
    },
    { branchId: user?.branch_id != null ? String(user.branch_id) : undefined }
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", user?.merchant_id, user?.branch_id, statusFilter],
    queryFn: () =>
      fetchOrders({
        branch_id: user?.branch_id != null ? String(user.branch_id) : undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
    enabled: !!user?.merchant_id,
  });

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => updateOrderStatus(orderId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const orders = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-slate-500">Loading orders…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert-error">{getApiError(error)}</div>;
  }

  return (
    <div className="space-y-5">
      {newOrderToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 shadow-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="font-semibold text-teal-800">New order</p>
            <p className="text-sm font-mono text-teal-600">#{newOrderToast.order_number}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
            {statusFilter && ` · ${statusLabels[statusFilter as OrderStatus]}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base w-auto py-2"
          >
            <option value="">All statuses</option>
            {(Object.keys(statusLabels) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty */}
      {orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <ClipboardList className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No orders found</p>
          <p className="mt-1 text-sm text-slate-400">
            {statusFilter
              ? `No orders with status "${statusLabels[statusFilter as OrderStatus]}"`
              : "Orders will appear here once placed."}
          </p>
        </div>
      ) : (
        /* Table card */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Customer</th>
                  <th className="hidden md:table-cell">Type</th>
                  <th className="hidden lg:table-cell">Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    {/* Order number */}
                    <td>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono font-semibold text-slate-800 hover:text-teal-600 transition-colors"
                      >
                        #{order.order_number}
                      </Link>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={statusBadge[order.status]}>
                        {statusLabels[order.status]}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="hidden sm:table-cell">
                      <span className="text-slate-600">
                        {order.customer_name ?? (
                          <span className="text-slate-400 italic">Guest</span>
                        )}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="hidden md:table-cell">
                      <span className="capitalize text-slate-500">
                        {order.order_type ?? "—"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="hidden lg:table-cell text-slate-500 text-xs">
                      {new Date(order.created_at).toLocaleString()}
                    </td>

                    {/* Total */}
                    <td className="text-right font-semibold text-slate-800">
                      {order.total_price.toFixed(2)} EGP
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-teal-600"
                          title="View details"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>

                        {order.status === "placed" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: "accepted",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="flex h-8 items-center gap-1 rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                            title="Accept order"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Accept</span>
                          </button>
                        )}
                        {order.status === "accepted" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: "preparing",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="flex h-8 items-center gap-1 rounded-lg bg-amber-500 px-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                            title="Start preparing"
                          >
                            <ChefHat className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Preparing</span>
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: "ready",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                            title="Mark ready"
                          >
                            <span className="hidden sm:inline">Ready</span>
                          </button>
                        )}
                        {order.status === "ready" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: "completed",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            title="Complete"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Complete</span>
                          </button>
                        )}
                        {["placed", "accepted", "preparing"].includes(
                          order.status,
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus.mutate({
                                orderId: order.id,
                                status: "cancelled",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                            title="Cancel order"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
