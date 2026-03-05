"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts";
import {
  fetchMenus, fetchMenuCategories,
  createCategory, updateCategory, deleteCategory, getApiError,
} from "@/lib/api";
import type { CategoryDto } from "@/lib/api/menus";
import { useForm } from "react-hook-form";
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight,
  FolderOpen, X, Check, Tag,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const canEdit = (role: string) => role === "owner" || role === "manager";

export default function MenuDetailPage() {
  const params = useParams();
  const menuId = params?.menuId as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: menus } = useQuery({
    queryKey: ["menus", user?.merchant_id],
    queryFn: fetchMenus,
    enabled: !!user?.merchant_id,
  });

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["menuCategories", menuId],
    queryFn: () => fetchMenuCategories(menuId),
    enabled: !!menuId,
  });

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof createCategory>[1]) => createCategory(menuId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuCategories", menuId] }); setAdding(false); showToast("ok", "Category created."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ categoryId, body }: { categoryId: string; body: Parameters<typeof updateCategory>[1] }) => updateCategory(categoryId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuCategories", menuId] }); setEditingId(null); showToast("ok", "Category updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuCategories", menuId] }); showToast("ok", "Category deleted."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const editable = canEdit(user?.role ?? "");
  const menu = menus?.find((m) => m.id === menuId);
  const menuName = menu?.name_en ?? menu?.name_ar ?? "Menu";

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
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
            <span className="font-medium text-slate-700">{menuName}</span>
          </nav>
          <h1 className="page-title">{menuName}</h1>
          <p className="text-sm text-slate-500">{categories?.length ?? 0} categories</p>
        </div>
        {editable && (
          <button type="button" onClick={() => setAdding(true)} disabled={adding} className="btn-primary">
            <Plus className="h-4 w-4" /> Add category
          </button>
        )}
      </div>

      {/* Add category form */}
      {adding && (
        <div className="form-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">New category</h2>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <CreateCategoryForm
            onAdd={(body) => createMut.mutate(body)}
            onCancel={() => setAdding(false)}
            isPending={createMut.isPending}
          />
        </div>
      )}

      {/* List */}
      {!categories || categories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FolderOpen className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No categories yet</p>
          <p className="mt-1 text-sm text-slate-400">Add your first category to this menu.</p>
          {editable && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> Add category
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {categories.map((c) => (
            <div key={c.id}>
              <div className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Tag className="h-4 w-4 text-indigo-500" />
                </div>
                <Link
                  href={`/dashboard/menu/${menuId}/${c.id}`}
                  className="min-w-0 flex-1 font-medium text-slate-800 hover:text-teal-700 transition-colors"
                >
                  {c.name_en ?? c.name_ar}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-slate-400 sm:inline">#{c.sort_order}</span>
                  {!c.is_active && <span className="badge badge-neutral text-xs">Inactive</span>}
                  {editable && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                        className="btn-ghost p-1.5"
                        title="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm("Delete this category and all its items?")) deleteMut.mutate(c.id); }}
                        className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <Link href={`/dashboard/menu/${menuId}/${c.id}`} className="btn-ghost p-1.5">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {editingId === c.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <CategoryEditForm
                    category={c}
                    onSave={(body) => updateMut.mutate({ categoryId: c.id, body })}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMut.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Create form ─── */
function CreateCategoryForm({ onAdd, onCancel, isPending }: {
  onAdd: (body: Parameters<typeof createCategory>[1]) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<{
    name_ar: string; name_en: string;
    description_ar: string; description_en: string;
    sort_order: number; is_active: boolean;
  }>({ defaultValues: { sort_order: 0, is_active: true } });

  return (
    <form onSubmit={handleSubmit((d) => onAdd({
      name_ar: d.name_ar, name_en: d.name_en,
      description_ar: d.description_ar || undefined,
      description_en: d.description_en || undefined,
      sort_order: d.sort_order, is_active: d.is_active,
    }))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name (English) *</label>
          <input className="input-base" placeholder="e.g. Starters" {...register("name_en", { required: true })} />
        </div>
        <div>
          <label className="label">Name (Arabic)</label>
          <input className="input-base" placeholder="المقبلات" dir="rtl" {...register("name_ar")} />
        </div>
        <div>
          <label className="label">Description (English)</label>
          <input className="input-base" {...register("description_en")} />
        </div>
        <div>
          <label className="label">Description (Arabic)</label>
          <input className="input-base" dir="rtl" {...register("description_ar")} />
        </div>
        <div>
          <label className="label">Sort order</label>
          <input type="number" className="input-base" {...register("sort_order", { valueAsNumber: true })} />
        </div>
        <div className="flex items-center gap-2.5 self-end pb-2">
          <input type="checkbox" id="cat_active" className="h-4 w-4 rounded border-slate-300 text-teal-600" {...register("is_active")} />
          <label htmlFor="cat_active" className="text-sm font-medium text-slate-700">Active</label>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Create category
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

/* ─── Edit form ─── */
function CategoryEditForm({ category, onSave, onCancel, isPending }: {
  category: CategoryDto;
  onSave: (body: Parameters<typeof updateCategory>[1]) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name_en: category.name_en ?? "",
      name_ar: category.name_ar ?? "",
      sort_order: category.sort_order,
      is_active: category.is_active,
    },
  });
  return (
    <form onSubmit={handleSubmit((d) => onSave({ name_en: d.name_en, name_ar: d.name_ar, sort_order: d.sort_order, is_active: d.is_active }))}>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label text-xs">Name (EN)</label>
          <input className="input-base" placeholder="Name EN" {...register("name_en")} />
        </div>
        <div>
          <label className="label text-xs">Name (AR)</label>
          <input className="input-base" dir="rtl" placeholder="Name AR" {...register("name_ar")} />
        </div>
        <div>
          <label className="label text-xs">Sort order</label>
          <input type="number" className="input-base" {...register("sort_order", { valueAsNumber: true })} />
        </div>
        <div className="flex items-center gap-2 self-end pb-2.5">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600" {...register("is_active")} />
          <span className="text-sm text-slate-700">Active</span>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}
