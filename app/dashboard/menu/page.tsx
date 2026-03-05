"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import { fetchMenus, createMenu, updateMenu, deleteMenu, getApiError } from "@/lib/api";
import type { MenuDto } from "@/lib/api/menus";
import { useForm } from "react-hook-form";
import {
  UtensilsCrossed, Loader2, Pencil, ChevronRight,
  Plus, Layers, Globe, ToggleLeft, ToggleRight, X, Check,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const canEdit = (role: string) => role === "owner" || role === "manager";

/* ─── Status badge ─── */
function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="badge badge-success">Active</span>
  ) : (
    <span className="badge badge-neutral">Inactive</span>
  );
}

export default function DashboardMenuPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: menus, isLoading, error } = useQuery({
    queryKey: ["menus", user?.merchant_id],
    queryFn: fetchMenus,
    enabled: !!user?.merchant_id,
  });

  const createMut = useMutation({
    mutationFn: createMenu,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menus"] }); setCreating(false); showToast("ok", "Menu created."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ menuId, body }: { menuId: string; body: Parameters<typeof updateMenu>[1] }) => updateMenu(menuId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menus"] }); setEditingId(null); showToast("ok", "Menu updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const editable = canEdit(user?.role ?? "");

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <p className="text-sm text-slate-500">Loading menus…</p>
    </div>
  );

  if (error) return <div className="alert-error">{getApiError(error)}</div>;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <UtensilsCrossed className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="page-title">Menus</h1>
            <p className="text-sm text-slate-500">{menus?.length ?? 0} menu{menus?.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <Link href="/dashboard/menu/modifiers" className="btn-secondary">
              <Layers className="h-4 w-4" />
              Modifier groups
            </Link>
          )}
          {editable && !creating && (
            <button type="button" onClick={() => setCreating(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              New menu
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="form-card">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="section-title">Create menu</h2>
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost p-1.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          <CreateMenuForm
            onSubmit={(data) => createMut.mutate(data)}
            onCancel={() => setCreating(false)}
            isPending={createMut.isPending}
          />
        </div>
      )}

      {/* Menu list */}
      {!menus || menus.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UtensilsCrossed className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No menus yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first menu to get started.</p>
          {editable && !creating && (
            <button type="button" onClick={() => setCreating(true)} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> Create menu
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {menus.map((menu) => (
            <div key={menu.id}>
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 sm:flex">
                  <Globe className="h-5 w-5 text-amber-500" />
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/menu/${menu.id}`}
                    className="font-semibold text-slate-800 hover:text-teal-700 transition-colors"
                  >
                    {menu.name_en ?? menu.name_ar ?? menu.id}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">{menu.currancy ?? menu.currency ?? "EGP"}</span>
                    <ActiveBadge active={menu.is_active} />
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === menu.id ? null : menu.id)}
                      className={`btn-ghost btn-sm ${editingId === menu.id ? "bg-slate-100 text-teal-700" : ""}`}
                      title="Edit menu"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <Link
                    href={`/dashboard/menu/${menu.id}`}
                    className="btn-ghost btn-sm"
                    title="View categories"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {editingId === menu.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-700">Edit menu</h3>
                  <MenuEditForm
                    menu={menu}
                    onSave={(body) => updateMut.mutate({ menuId: menu.id, body })}
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
function CreateMenuForm({
  onSubmit, onCancel, isPending,
}: {
  onSubmit: (data: { name_ar: string; name_en: string; currency?: string; is_active?: boolean }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<{
    name_ar: string; name_en: string; currency: string; is_active: boolean;
  }>({ defaultValues: { currency: "EGP", is_active: true } });

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ name_ar: d.name_ar.trim(), name_en: d.name_en.trim(), currency: d.currency || "EGP", is_active: d.is_active }))}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Name (English) *</label>
          <input className="input-base" placeholder="e.g. Main Menu" {...register("name_en", { required: true })} />
        </div>
        <div>
          <label className="label">Name (Arabic)</label>
          <input className="input-base" placeholder="القائمة الرئيسية" dir="rtl" {...register("name_ar")} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input className="input-base" placeholder="EGP" {...register("currency")} />
        </div>
        <div className="flex items-center gap-2.5 sm:col-span-3">
          <input type="checkbox" id="is_active_new" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" {...register("is_active")} />
          <label htmlFor="is_active_new" className="text-sm font-medium text-slate-700">Set as active</label>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Check className="h-4 w-4" /> Create menu</>}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

/* ─── Edit form ─── */
function MenuEditForm({ menu, onSave, onCancel, isPending }: {
  menu: MenuDto;
  onSave: (body: Parameters<typeof updateMenu>[1]) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name_en: menu.name_en ?? "",
      name_ar: menu.name_ar ?? "",
      currency: menu.currancy ?? menu.currency ?? "EGP",
      is_active: menu.is_active,
    },
  });
  return (
    <form onSubmit={handleSubmit((d) => onSave({ name_en: d.name_en?.trim(), name_ar: d.name_ar?.trim(), currency: d.currency || "EGP", is_active: d.is_active }))}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label text-xs">Name (EN)</label>
          <input className="input-base" {...register("name_en")} />
        </div>
        <div>
          <label className="label text-xs">Name (AR)</label>
          <input className="input-base" dir="rtl" {...register("name_ar")} />
        </div>
        <div>
          <label className="label text-xs">Currency</label>
          <input className="input-base" {...register("currency")} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-3">
          <input type="checkbox" id="is_active_edit" className="h-4 w-4 rounded border-slate-300 text-teal-600" {...register("is_active")} />
          <label htmlFor="is_active_edit" className="text-sm text-slate-700">Active</label>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}
