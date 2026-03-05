"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import {
  fetchModifierGroups, fetchModifiers,
  createModifierGroup, updateModifierGroup, deleteModifierGroup,
  createModifier, updateModifier, deleteModifier,
  getApiError,
} from "@/lib/api";
import { useForm } from "react-hook-form";
import {
  Loader2, Plus, Pencil, Trash2, Layers,
  ChevronDown, ChevronRight, Check, X, DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const canEdit = (role: string) => role === "owner" || role === "manager";

export default function ModifiersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [addingModForGroup, setAddingModForGroup] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text }); setTimeout(() => setToast(null), 3500);
  };

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["modifierGroups"],
    queryFn: fetchModifierGroups,
    enabled: !!user?.merchant_id,
  });

  const { data: modifiers } = useQuery({
    queryKey: ["modifiers", expandedId],
    queryFn: () => fetchModifiers(expandedId!),
    enabled: !!expandedId,
  });

  const createGroupMut = useMutation({
    mutationFn: createModifierGroup,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modifierGroups"] }); setCreatingGroup(false); showToast("ok", "Group created."); },
    onError: (e) => showToast("err", getApiError(e)),
  });
  const updateGroupMut = useMutation({
    mutationFn: ({ groupId, body }: { groupId: string; body: Parameters<typeof updateModifierGroup>[1] }) => updateModifierGroup(groupId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modifierGroups"] }); setEditingGroupId(null); showToast("ok", "Group updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });
  const deleteGroupMut = useMutation({
    mutationFn: deleteModifierGroup,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modifierGroups"] }); setExpandedId(null); showToast("ok", "Group deleted."); },
    onError: (e) => showToast("err", getApiError(e)),
  });
  const createModMut = useMutation({
    mutationFn: ({ groupId, body }: { groupId: string; body: Parameters<typeof createModifier>[1] }) => createModifier(groupId, body),
    onSuccess: (_, { groupId }) => { queryClient.invalidateQueries({ queryKey: ["modifiers", groupId] }); setAddingModForGroup(null); showToast("ok", "Modifier added."); },
    onError: (e) => showToast("err", getApiError(e)),
  });
  const updateModMut = useMutation({
    mutationFn: ({ modifierId, body }: { modifierId: string; body: Parameters<typeof updateModifier>[1] }) => updateModifier(modifierId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modifiers", expandedId] }); setEditingModId(null); showToast("ok", "Modifier updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });
  const deleteModMut = useMutation({
    mutationFn: deleteModifier,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["modifiers", expandedId] }); showToast("ok", "Modifier deleted."); },
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
            <span className="font-medium text-slate-700">Modifier groups</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <Layers className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="page-title">Modifier groups</h1>
              <p className="text-sm text-slate-500">{groups?.length ?? 0} groups</p>
            </div>
          </div>
        </div>
        {editable && !creatingGroup && (
          <button type="button" onClick={() => setCreatingGroup(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New group
          </button>
        )}
      </div>

      {/* Info tip */}
      <div className="alert-info text-xs">
        Create groups (e.g. "Extras", "Sauces"), add options with prices, then attach them to items from the item detail page.
      </div>

      {/* Create group form */}
      {creatingGroup && (
        <div className="form-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">New modifier group</h2>
            <button type="button" onClick={() => setCreatingGroup(false)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <GroupForm
            onSubmit={(b) => createGroupMut.mutate(b)}
            onCancel={() => setCreatingGroup(false)}
            isPending={createGroupMut.isPending}
          />
        </div>
      )}

      {/* Groups */}
      {!groups || groups.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Layers className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No modifier groups</p>
          <p className="mt-1 text-sm text-slate-400">Create a group to add options like extras, sizes, or add-ons.</p>
          {editable && !creatingGroup && (
            <button type="button" onClick={() => setCreatingGroup(true)} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> New group
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="card overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <Layers className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{g.name_en ?? g.name_ar ?? g.id}</p>
                    {g.name_ar && <p className="text-xs text-slate-400" dir="rtl">{g.name_ar}</p>}
                  </div>
                  {expandedId === g.id
                    ? <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    : <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                  }
                </button>
                {editable && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button"
                      onClick={() => setEditingGroupId(editingGroupId === g.id ? null : g.id)}
                      className={`btn-ghost p-1.5 ${editingGroupId === g.id ? "bg-slate-100" : ""}`}
                      title="Edit group">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button"
                      onClick={() => { if (confirm("Delete this group and all its modifiers?")) deleteGroupMut.mutate(g.id); }}
                      className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                      title="Delete group">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline edit group form */}
              {editingGroupId === g.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Edit group</h3>
                  <GroupForm
                    defaultValues={{ name_en: g.name_en ?? "", name_ar: g.name_ar ?? "" }}
                    onSubmit={(b) => updateGroupMut.mutate({ groupId: g.id, body: b })}
                    onCancel={() => setEditingGroupId(null)}
                    isPending={updateGroupMut.isPending}
                  />
                </div>
              )}

              {/* Expanded: modifiers */}
              {expandedId === g.id && (
                <div className="border-t border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <h3 className="text-sm font-semibold text-slate-600">Options / Modifiers</h3>
                    {editable && (
                      <button type="button"
                        onClick={() => setAddingModForGroup(addingModForGroup === g.id ? null : g.id)}
                        className="btn-primary btn-sm">
                        <Plus className="h-3.5 w-3.5" /> Add option
                      </button>
                    )}
                  </div>

                  {/* Add modifier form */}
                  {addingModForGroup === g.id && (
                    <div className="border-b border-slate-100 bg-teal-50 px-5 py-4">
                      <ModifierForm
                        onSubmit={(b) => createModMut.mutate({ groupId: g.id, body: b })}
                        onCancel={() => setAddingModForGroup(null)}
                        isPending={createModMut.isPending}
                      />
                    </div>
                  )}

                  {/* Modifier list */}
                  {!modifiers || modifiers.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400 italic">No options yet. Add one above.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Option name</th>
                          <th>Price</th>
                          {editable && <th className="text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {modifiers.map((m) => (
                          <tr key={m.id}>
                            {editingModId === m.id ? (
                              <td colSpan={editable ? 3 : 2} className="p-0">
                                <div className="bg-slate-50 px-5 py-4">
                                  <ModifierForm
                                    defaultValues={{ name_en: m.name_en ?? "", name_ar: m.name_ar ?? "", price: m.price }}
                                    onSubmit={(b) => updateModMut.mutate({ modifierId: m.id, body: b })}
                                    onCancel={() => setEditingModId(null)}
                                    isPending={updateModMut.isPending}
                                  />
                                </div>
                              </td>
                            ) : (
                              <>
                                <td>
                                  <span className="font-medium text-slate-700">{m.name_en ?? m.name_ar}</span>
                                  {m.name_ar && m.name_en && (
                                    <span className="ml-2 text-xs text-slate-400" dir="rtl">{m.name_ar}</span>
                                  )}
                                </td>
                                <td>
                                  <span className="flex items-center gap-1 font-semibold text-teal-700">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    {m.price.toFixed(2)} EGP
                                  </span>
                                </td>
                                {editable && (
                                  <td className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button type="button" onClick={() => setEditingModId(m.id)} className="btn-ghost p-1.5" title="Edit">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button type="button"
                                        onClick={() => { if (confirm("Delete this modifier?")) deleteModMut.mutate(m.id); }}
                                        className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                                        title="Delete">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Group form ─── */
function GroupForm({ defaultValues, onSubmit, onCancel, isPending }: {
  defaultValues?: { name_en?: string; name_ar?: string };
  onSubmit: (b: { name_ar: string; name_en: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<{ name_ar: string; name_en: string }>({
    defaultValues: { name_en: defaultValues?.name_en ?? "", name_ar: defaultValues?.name_ar ?? "" },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Group name (English) *</label>
          <input className="input-base" placeholder="e.g. Extras" {...register("name_en", { required: true })} />
        </div>
        <div>
          <label className="label">Group name (Arabic)</label>
          <input className="input-base" dir="rtl" placeholder="إضافات" {...register("name_ar")} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {defaultValues ? "Save" : "Create group"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}

/* ─── Modifier form ─── */
function ModifierForm({ defaultValues, onSubmit, onCancel, isPending }: {
  defaultValues?: { name_en?: string; name_ar?: string; price?: number };
  onSubmit: (b: { name_ar: string; name_en: string; price: number }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<{ name_en: string; name_ar: string; price: number }>({
    defaultValues: { name_en: defaultValues?.name_en ?? "", name_ar: defaultValues?.name_ar ?? "", price: defaultValues?.price ?? 0 },
  });
  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ name_en: d.name_en, name_ar: d.name_ar, price: Number(d.price) }))}
      className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-28">
        <label className="label text-xs">Name (EN) *</label>
        <input className="input-base" placeholder="e.g. Extra cheese" {...register("name_en", { required: true })} />
      </div>
      <div className="flex-1 min-w-28">
        <label className="label text-xs">Name (AR)</label>
        <input className="input-base" dir="rtl" placeholder="جبنة إضافية" {...register("name_ar")} />
      </div>
      <div className="w-28">
        <label className="label text-xs">Price (EGP) *</label>
        <input type="number" step="0.01" min="0" className="input-base" {...register("price", { valueAsNumber: true })} />
      </div>
      <div className="flex gap-2 pb-0.5">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {defaultValues ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}
