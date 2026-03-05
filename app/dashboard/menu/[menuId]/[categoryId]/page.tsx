"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts";
import {
  fetchMenus, fetchMenuCategories, fetchCategoryItems,
  createItem, deleteItem, getApiError,
} from "@/lib/api";
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight,
  Package, X, Check, DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const canEdit = (role: string) => role === "owner" || role === "manager";

const itemStatusBadge: Record<string, string> = {
  active:       "badge badge-success",
  hidden:       "badge badge-neutral",
  out_of_stock: "badge badge-error",
};

export default function CategoryItemsPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = params?.menuId as string;
  const categoryId = params?.categoryId as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text }); setTimeout(() => setToast(null), 3500);
  };

  const { data: menus } = useQuery({ queryKey: ["menus", user?.merchant_id], queryFn: fetchMenus, enabled: !!user?.merchant_id });
  const { data: categories } = useQuery({ queryKey: ["menuCategories", menuId], queryFn: () => fetchMenuCategories(menuId), enabled: !!menuId });
  const { data: items, isLoading, error } = useQuery({ queryKey: ["categoryItems", categoryId], queryFn: () => fetchCategoryItems(categoryId), enabled: !!categoryId && !!user?.merchant_id });

  const menu = menus?.find((m) => m.id === menuId);
  const category = categories?.find((c) => c.id === categoryId);
  const menuName = menu?.name_en ?? menu?.name_ar ?? "Menu";
  const categoryName = category?.name_en ?? category?.name_ar ?? "Category";

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof createItem>[1]) => createItem(categoryId, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categoryItems", categoryId] });
      setAdding(false);
      router.push(`/dashboard/menu/${menuId}/${categoryId}/${data.id}`);
    },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categoryItems", categoryId] }); showToast("ok", "Item deleted."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const editable = canEdit(user?.role ?? "");

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );

  if (error) return <div className="alert-error">{getApiError(error)}</div>;

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb mb-1.5">
            <Link href="/dashboard/menu" className="hover:text-teal-600">Menus</Link>
            <span className="breadcrumb-sep">/</span>
            <Link href={`/dashboard/menu/${menuId}`} className="hover:text-teal-600">{menuName}</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="font-medium text-slate-700">{categoryName}</span>
          </nav>
          <h1 className="page-title">{categoryName}</h1>
          <p className="text-sm text-slate-500">{items?.length ?? 0} items</p>
        </div>
        {editable && (
          <button type="button" onClick={() => setAdding(true)} disabled={adding} className="btn-primary">
            <Plus className="h-4 w-4" /> Add item
          </button>
        )}
      </div>

      {/* Add item form */}
      {adding && (
        <div className="form-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="section-title">New item</h2>
              <p className="mt-0.5 text-xs text-slate-500">After creating, you can add variants and modifier groups on the item page.</p>
            </div>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <CreateItemForm
            onAdd={(body) => createMut.mutate(body)}
            onCancel={() => setAdding(false)}
            isPending={createMut.isPending}
          />
        </div>
      )}

      {/* Items table */}
      {!items || items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No items yet</p>
          <p className="mt-1 text-sm text-slate-400">Add items to this category.</p>
          {editable && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> Add item
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="hidden sm:table-cell">Base price</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      href={`/dashboard/menu/${menuId}/${categoryId}/${item.id}`}
                      className="font-medium text-slate-800 hover:text-teal-700 transition-colors"
                    >
                      {item.name_en ?? item.name_ar ?? item.id}
                    </Link>
                    {item.name_ar && item.name_en && (
                      <p className="text-xs text-slate-400 mt-0.5" dir="rtl">{item.name_ar}</p>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="flex items-center gap-1 font-semibold text-teal-700">
                      <DollarSign className="h-3.5 w-3.5" />
                      {item.base_price.toFixed(2)} EGP
                    </span>
                  </td>
                  <td>
                    <span className={itemStatusBadge[item.status] ?? "badge badge-neutral"}>
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/menu/${menuId}/${categoryId}/${item.id}`}
                        className="btn-ghost p-1.5"
                        title="Edit item"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => { if (confirm("Delete this item?")) deleteMut.mutate(item.id); }}
                          className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <Link href={`/dashboard/menu/${menuId}/${categoryId}/${item.id}`} className="btn-ghost p-1.5">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Create item form ─── */
function CreateItemForm({ onAdd, onCancel, isPending }: {
  onAdd: (body: Parameters<typeof createItem>[1]) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<{
    name_ar: string; name_en: string;
    base_price: number; description_ar: string;
    description_en: string; status: string;
  }>({ defaultValues: { base_price: 0, status: "active", description_ar: "", description_en: "" } });

  return (
    <form onSubmit={handleSubmit((d) => onAdd({
      name_ar: d.name_ar, name_en: d.name_en,
      base_price: Number(d.base_price),
      description_ar: d.description_ar || undefined,
      description_en: d.description_en || undefined,
      status: d.status as "active" | "hidden" | "out_of_stock",
    }))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name (English) *</label>
          <input className="input-base" placeholder="e.g. Grilled Chicken" {...register("name_en", { required: true })} />
        </div>
        <div>
          <label className="label">Name (Arabic)</label>
          <input className="input-base" dir="rtl" placeholder="دجاج مشوي" {...register("name_ar")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description (English)</label>
          <textarea rows={2} className="input-base resize-none" {...register("description_en")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description (Arabic)</label>
          <textarea rows={2} className="input-base resize-none" dir="rtl" {...register("description_ar")} />
        </div>
        <div>
          <label className="label">Base price (EGP) *</label>
          <input type="number" step="0.01" min="0" className="input-base" {...register("base_price", { required: true, valueAsNumber: true })} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-base" {...register("status")}>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Check className="h-4 w-4" /> Create &amp; open item</>}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
