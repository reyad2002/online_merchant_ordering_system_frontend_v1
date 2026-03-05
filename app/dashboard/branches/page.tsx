"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import {
  fetchBranches, createBranch, updateBranch, deleteBranch,
  fetchBranchTables, createTable, getApiError,
} from "@/lib/api";
import { fetchTableQr, updateTable, deleteTable } from "@/lib/api/tables";
import { useForm } from "react-hook-form";
import {
  MapPin, Loader2, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, QrCode, X, Check,
  Phone, Home, ShieldAlert, TableProperties,
} from "lucide-react";
import { useState } from "react";

interface BranchForm { name: string; address: string; phone: string; is_active: boolean; }
interface TableForm { number: string; seats: string; qr_code: string; }
interface TableEditFormData { number: string; seats: string; is_active: boolean; qr_code: string; }

function Toast({ toast }: { toast: { type: "ok" | "err"; text: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {toast.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {toast.text}
    </div>
  );
}

export default function BranchesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [addingTableBranch, setAddingTableBranch] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [qrTableId, setQrTableId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text }); setTimeout(() => setToast(null), 3500);
  };

  const { data: branches, isLoading, error } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: !!user?.merchant_id && user?.role === "owner",
  });

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ["branchTables", expandedBranch],
    queryFn: () => fetchBranchTables(expandedBranch!),
    enabled: !!expandedBranch,
  });

  const { data: qrData } = useQuery({
    queryKey: ["tableQr", qrTableId],
    queryFn: () => fetchTableQr(qrTableId!),
    enabled: !!qrTableId,
  });

  const createBranchMut = useMutation({
    mutationFn: createBranch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); setCreating(false); showToast("ok", "Branch created."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const updateBranchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateBranch>[1] }) => updateBranch(id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); setEditingBranch(null); showToast("ok", "Branch updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const deleteBranchMut = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); setExpandedBranch(null); showToast("ok", "Branch deleted."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const createTableMut = useMutation({
    mutationFn: ({ branchId, body }: { branchId: string; body: { number: number; seats?: number; is_active?: boolean; qr_code?: string | null } }) =>
      createTable(branchId, { ...body, is_active: true }),
    onSuccess: (_, { branchId }) => { queryClient.invalidateQueries({ queryKey: ["branchTables", branchId] }); setAddingTableBranch(null); showToast("ok", "Table created."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const updateTableMut = useMutation({
    mutationFn: ({ tableId, body }: { tableId: string; body: { number?: number; seats?: number; is_active?: boolean; qr_code?: string | null } }) => updateTable(tableId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branchTables", expandedBranch] }); setEditingTableId(null); showToast("ok", "Table updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const deleteTableMut = useMutation({
    mutationFn: deleteTable,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branchTables", expandedBranch] }); showToast("ok", "Table deleted."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  if (user?.role !== "owner") {
    return (
      <div className="alert-warning flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        Only owners can manage branches.
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );

  if (error) return <div className="alert-error">{getApiError(error)}</div>;

  return (
    <div className="space-y-5">
      <Toast toast={toast} />

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
            <MapPin className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="page-title">Branches</h1>
            <p className="text-sm text-slate-500">{branches?.length ?? 0} branch{branches?.length !== 1 ? "es" : ""}</p>
          </div>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New branch
          </button>
        )}
      </div>

      {/* Create branch form */}
      {creating && (
        <div className="form-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">New branch</h2>
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <BranchForm
            onSubmit={(data) => createBranchMut.mutate(data)}
            onCancel={() => setCreating(false)}
            isPending={createBranchMut.isPending}
          />
        </div>
      )}

      {/* Branch list */}
      {!branches || branches.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No branches yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first branch to manage tables and orders.</p>
          {!creating && (
            <button type="button" onClick={() => setCreating(true)} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> New branch
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <div key={branch.id} className="card overflow-hidden">
              {/* Branch row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setExpandedBranch(expandedBranch === branch.id ? null : branch.id)}
                  className="flex flex-1 items-center gap-3 text-left min-w-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                    <MapPin className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{branch.name}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      {branch.address && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Home className="h-3 w-3" /> {branch.address}
                        </span>
                      )}
                      {branch.phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Phone className="h-3 w-3" /> {branch.phone}
                        </span>
                      )}
                      {!branch.is_active && <span className="badge badge-neutral">Inactive</span>}
                    </div>
                  </div>
                  {expandedBranch === branch.id
                    ? <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    : <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                  }
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingBranch(editingBranch === branch.id ? null : branch.id)}
                    className={`btn-ghost p-1.5 ${editingBranch === branch.id ? "bg-slate-100" : ""}`}
                    title="Edit branch"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm("Delete this branch and all its tables?")) deleteBranchMut.mutate(branch.id); }}
                    className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                    title="Delete branch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Inline edit branch */}
              {editingBranch === branch.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-700">Edit branch</h3>
                  <BranchForm
                    defaultValues={{ name: branch.name, address: branch.address ?? "", phone: branch.phone ?? "", is_active: branch.is_active }}
                    onSubmit={(body) => updateBranchMut.mutate({ id: branch.id, body })}
                    onCancel={() => setEditingBranch(null)}
                    isPending={updateBranchMut.isPending}
                  />
                </div>
              )}

              {/* Expanded: tables */}
              {expandedBranch === branch.id && (
                <div className="border-t border-slate-100">
                  {/* Tables header */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <TableProperties className="h-4 w-4 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-600">Tables</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddingTableBranch(addingTableBranch === branch.id ? null : branch.id)}
                      className="btn-primary btn-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add table
                    </button>
                  </div>

                  {/* Add table form */}
                  {addingTableBranch === branch.id && (
                    <div className="border-b border-slate-100 bg-teal-50 px-5 py-4">
                      <AddTableForm
                        onAdd={(number, seats) => createTableMut.mutate({ branchId: branch.id, body: { number, seats: seats ? parseInt(seats, 10) : undefined } })}
                        onCancel={() => setAddingTableBranch(null)}
                        isPending={createTableMut.isPending}
                      />
                    </div>
                  )}

                  {/* Tables */}
                  {tablesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                    </div>
                  ) : !tables || tables.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400 italic">No tables yet. Add one above.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Table #</th>
                          <th>Seats</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tables.map((t) => (
                          <tr key={t.id}>
                            {editingTableId === t.id ? (
                              <td colSpan={4} className="p-0">
                                <div className="bg-slate-50 px-5 py-4">
                                  <TableEditForm
                                    table={t}
                                    onSave={(body) => updateTableMut.mutate({ tableId: t.id, body })}
                                    onCancel={() => setEditingTableId(null)}
                                    isPending={updateTableMut.isPending}
                                  />
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className="font-semibold text-slate-800">#{t.number}</td>
                                <td className="text-slate-500">{t.seats != null ? `${t.seats} seats` : "—"}</td>
                                <td>{t.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-neutral">Inactive</span>}</td>
                                <td className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setQrTableId(qrTableId === t.id ? null : t.id)}
                                      className="btn-ghost p-1.5 text-teal-600 hover:bg-teal-50"
                                      title="View QR"
                                    >
                                      <QrCode className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => setEditingTableId(t.id)} className="btn-ghost p-1.5" title="Edit">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { if (confirm("Delete this table?")) deleteTableMut.mutate(t.id); }}
                                      className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
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

      {/* QR Modal */}
      {qrData && qrTableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setQrTableId(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-teal-600" />
                <h2 className="font-semibold text-slate-800">Table QR Code</h2>
              </div>
              <button type="button" onClick={() => setQrTableId(null)} className="btn-ghost p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* QR content */}
            <div className="px-5 py-6 text-center">
              {qrData.table_code && (
                <p className="mb-4 text-sm text-slate-500">Code: <span className="font-mono font-semibold text-slate-700">{qrData.table_code}</span></p>
              )}
              {qrData.qr_svg ? (
                <div
                  className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-slate-100 bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qrData.qr_svg }}
                />
              ) : (
                <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
                  No QR image
                </div>
              )}
              {qrData.qr_url && (
                <p className="mt-4 break-all text-xs text-slate-400">
                  <a href={qrData.qr_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                    {qrData.qr_url}
                  </a>
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setQrTableId(null)} className="btn-secondary w-full justify-center">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Branch form (create + edit) ─── */
function BranchForm({ defaultValues, onSubmit, onCancel, isPending }: {
  defaultValues?: { name: string; address: string; phone: string; is_active: boolean };
  onSubmit: (data: { name: string; address?: string | null; phone?: string | null; is_active?: boolean }) => void;
  onCancel?: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, reset } = useForm<BranchForm>({
    defaultValues: defaultValues ?? { name: "", address: "", phone: "", is_active: true },
  });
  return (
    <form onSubmit={handleSubmit((d) => { onSubmit({ name: d.name, address: d.address || null, phone: d.phone || null, is_active: d.is_active }); if (!defaultValues) reset(); })}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Branch name *</label>
          <input className="input-base" placeholder="e.g. Downtown" {...register("name", { required: true })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input-base" placeholder="+20 100 000 0000" {...register("phone")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input className="input-base" placeholder="Street, City" {...register("address")} />
        </div>
        <div className="flex items-center gap-2.5">
          <input type="checkbox" id="branch_active" className="h-4 w-4 rounded border-slate-300 text-teal-600" {...register("is_active")} />
          <label htmlFor="branch_active" className="text-sm font-medium text-slate-700">Active</label>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {defaultValues ? "Save changes" : "Create branch"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
      </div>
    </form>
  );
}

/* ─── Add table form ─── */
function AddTableForm({ onAdd, onCancel, isPending }: {
  onAdd: (number: number, seats?: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<{ number: string; seats: string }>();
  return (
    <form onSubmit={handleSubmit((d) => onAdd(parseInt(d.number, 10), d.seats || undefined))}
      className="flex flex-wrap items-end gap-3">
      <div className="w-24">
        <label className="label text-xs">Table # *</label>
        <input type="number" min={1} className="input-base" placeholder="e.g. 5" {...register("number", { required: true })} />
      </div>
      <div className="w-24">
        <label className="label text-xs">Seats</label>
        <input type="number" min={1} className="input-base" placeholder="e.g. 4" {...register("seats")} />
      </div>
      <div className="flex gap-2 pb-0.5">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Add
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}

/* ─── Edit table form (inline row) ─── */
function TableEditForm({ table, onSave, onCancel, isPending }: {
  table: { id: string; number: number; seats?: number; is_active: boolean };
  onSave: (body: { number?: number; seats?: number; is_active?: boolean }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<TableEditFormData>({
    defaultValues: { number: String(table.number), seats: table.seats != null ? String(table.seats) : "", is_active: table.is_active, qr_code: "" },
  });
  return (
    <form onSubmit={handleSubmit((d) => onSave({ number: parseInt(d.number, 10), seats: d.seats ? parseInt(d.seats, 10) : undefined, is_active: d.is_active }))}
      className="flex flex-wrap items-end gap-3">
      <div className="w-24">
        <label className="label text-xs">Table #</label>
        <input type="number" className="input-base" {...register("number", { required: true })} />
      </div>
      <div className="w-24">
        <label className="label text-xs">Seats</label>
        <input type="number" className="input-base" {...register("seats")} />
      </div>
      <div className="flex items-center gap-2 pb-2.5">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600" {...register("is_active")} />
        <span className="text-sm text-slate-700">Active</span>
      </div>
      <div className="flex gap-2 pb-0.5">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}
