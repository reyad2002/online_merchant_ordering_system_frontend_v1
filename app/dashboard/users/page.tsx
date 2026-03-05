"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import {
  fetchUsers, createUser, updateUser,
  updateUserStatus, deleteUser, getApiError,
} from "@/lib/api";
import { fetchBranches } from "@/lib/api";
import type { UserRole } from "@/lib/types";
import { useForm } from "react-hook-form";
import {
  Users as UsersIcon, Loader2, Plus, Pencil, Trash2,
  Check, X, ShieldAlert, UserCircle2, MapPin,
  ToggleLeft, ToggleRight, KeyRound,
} from "lucide-react";
import { useState } from "react";

interface UserForm {
  name: string;
  password: string;
  role: UserRole;
  branch_id: string;
}

const roleBadge: Record<string, string> = {
  owner:   "badge bg-violet-100 text-violet-700",
  manager: "badge bg-sky-100 text-sky-700",
  cashier: "badge bg-amber-100 text-amber-700",
  kitchen: "badge bg-orange-100 text-orange-700",
};

const roleAvatar: Record<string, string> = {
  owner:   "bg-violet-600",
  manager: "bg-sky-600",
  cashier: "bg-amber-500",
  kitchen: "bg-orange-500",
};

function Toast({ toast }: { toast: { type: "ok" | "err"; text: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {toast.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {toast.text}
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text }); setTimeout(() => setToast(null), 3500);
  };

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: !!currentUser?.merchant_id && currentUser?.role === "owner",
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: !!currentUser?.merchant_id,
  });

  const createMut = useMutation({
    mutationFn: (body: { name: string; password: string; role: UserRole; branch_id?: string | null }) =>
      createUser({ merchant_id: String(currentUser!.merchant_id), name: body.name, password: body.password, role: body.role, branch_id: body.branch_id || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setCreating(false); showToast("ok", "User created."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: { name?: string; role?: UserRole; branch_id?: string | null } }) =>
      updateUser(String(userId), body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setEditingId(null); showToast("ok", "User updated."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  const statusMut = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "active" | "disabled" }) => updateUserStatus(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    onError: (e) => showToast("err", getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setEditingId(null); showToast("ok", "User deleted."); },
    onError: (e) => showToast("err", getApiError(e)),
  });

  if (currentUser?.role !== "owner") {
    return (
      <div className="alert-warning flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        Only owners can manage users.
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <UsersIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="page-title">Users</h1>
            <p className="text-sm text-slate-500">{users?.length ?? 0} team member{users?.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New user
          </button>
        )}
      </div>

      {/* Create user form */}
      {creating && (
        <div className="form-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="section-title">New user</h2>
              <p className="mt-0.5 text-xs text-slate-500">Invite a team member to your merchant account.</p>
            </div>
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost p-1.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          <CreateUserForm
            branches={branches ?? []}
            onSubmit={(data) => createMut.mutate({ name: data.name, password: data.password, role: data.role, branch_id: data.branch_id || null })}
            onCancel={() => setCreating(false)}
            isPending={createMut.isPending}
          />
        </div>
      )}

      {/* Users table */}
      {!users || users.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UsersIcon className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No users yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first team member above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th className="hidden md:table-cell">Branch</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              { users.map((u) => (
                u.role !== "owner" && (
                <>
                  <tr key={u.id} className={editingId === Number(u.id) ? "bg-slate-50" : ""}>
                    {/* Avatar + name */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${roleAvatar[u.role] ?? "bg-slate-500"}`}>
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">
                            {u.name}
                            {u.id === currentUser?.id && (
                              <span className="ml-1.5 text-[10px] font-medium text-teal-600">(you)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td>
                      <span className={roleBadge[u.role] ?? "badge badge-neutral"}>
                        {u.role}
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="hidden md:table-cell">
                      {u.branch_id != null ? (
                        <span className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {branches?.find((b) => String(b.id) === String(u.branch_id))?.name ?? `#${u.branch_id}`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      {u.status === "active"
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-neutral">Disabled</span>
                      }
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle status */}
                        <button
                          type="button"
                          onClick={() => statusMut.mutate({ userId: String(u.id), status: u.status === "active" ? "disabled" : "active" })}
                          disabled={statusMut.isPending}
                          className={`btn-ghost p-1.5 ${u.status === "active" ? "text-amber-500 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                          title={u.status === "active" ? "Disable user" : "Enable user"}
                        >
                          {u.status === "active" ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>

                        {/* Edit / delete (not for owner or self) */}
                        {u.id !== currentUser?.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingId(editingId === Number(u.id) ? null : Number(u.id))}
                              className={`btn-ghost p-1.5 ${editingId === Number(u.id) ? "bg-slate-100" : ""}`}
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (confirm("Delete this user?")) deleteMut.mutate(String(u.id)); }}
                              className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editingId === Number(u.id) && (
                    <tr key={`${u.id}-edit`} className="bg-slate-50">
                      <td colSpan={5} className="p-0">
                        <div className="border-t border-slate-200 px-5 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-slate-400" />
                            <h3 className="text-sm font-semibold text-slate-700">Edit {u.name}</h3>
                          </div>
                          <EditUserForm
                            user={{ name: u.name, role: u.role, branch_id: u.branch_id != null ? String(u.branch_id) : null }}
                            branches={branches ?? []}
                            onSave={(body) => updateMut.mutate({ userId: Number(u.id), body })}
                            onCancel={() => setEditingId(null)}
                            isPending={updateMut.isPending}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Create user form ─── */
function CreateUserForm({ branches, onSubmit, onCancel, isPending }: {
  branches: { id: string; name: string }[];
  onSubmit: (data: UserForm) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, reset } = useForm<UserForm>({ defaultValues: { role: "cashier" } });
  return (
    <form onSubmit={handleSubmit((d) => { onSubmit(d); reset(); })}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5">
              <UserCircle2 className="h-3.5 w-3.5" /> Username *
            </span>
          </label>
          <input className="input-base" placeholder="e.g. john_doe" {...register("name", { required: true })} />
        </div>
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Password *
            </span>
          </label>
          <input type="password" className="input-base" placeholder="Min 6 characters" {...register("password", { required: true, minLength: 6 })} />
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input-base" {...register("role", { required: true })}>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen">Kitchen</option>
          </select>
        </div>
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Branch
            </span>
          </label>
          <select className="input-base" {...register("branch_id")}>
            <option value="">— No branch —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Check className="h-4 w-4" /> Create user</>}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

/* ─── Edit user form (inline) ─── */
function EditUserForm({ user, branches, onSave, onCancel, isPending }: {
  user: { name: string; role: UserRole; branch_id: string | null };
  branches: { id: string; name: string }[];
  onSave: (body: { name?: string; role?: UserRole; branch_id?: string | null }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm<UserForm>({
    defaultValues: { name: user.name, role: user.role, branch_id: user.branch_id ?? "", password: "" },
  });
  return (
    <form onSubmit={handleSubmit((d) => onSave({ name: d.name, role: d.role, branch_id: d.branch_id || null }))}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label text-xs">Name</label>
          <input className="input-base" {...register("name")} />
        </div>
        <div>
          <label className="label text-xs">Role</label>
          <select className="input-base" {...register("role")}>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen">Kitchen</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Branch</label>
          <select className="input-base" {...register("branch_id")}>
            <option value="">— No branch —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </form>
  );
}
