"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import { fetchMerchants, updateMerchant, getApiError } from "@/lib/api";
import { useForm } from "react-hook-form";
import { Store, Loader2, Save, Palette, Link2, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface MerchantForm {
  name: string;
  logo: string;
  has_color_1: string;
  has_color_2: string;
  status: string;
}

export default function MerchantPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: merchants, isLoading, error } = useQuery({
    queryKey: ["merchants"],
    queryFn: fetchMerchants,
    enabled: !!user?.merchant_id,
  });

  const merchant = merchants?.[0];

  const update = useMutation({
    mutationFn: (body: Parameters<typeof updateMerchant>[1]) =>
      updateMerchant(merchant!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      setMessage({ type: "ok", text: "Merchant updated successfully." });
    },
    onError: (err) => setMessage({ type: "err", text: getApiError(err) }),
  });

  const { register, handleSubmit, watch } = useForm<MerchantForm>({
    values: merchant
      ? {
          name: merchant.name ?? "",
          logo: merchant.logo ?? "",
          has_color_1: merchant.has_color_1 ?? "",
          has_color_2: merchant.has_color_2 ?? "",
          status: merchant.status ?? "active",
        }
      : undefined,
  });

  const color1 = watch("has_color_1");
  const color2 = watch("has_color_2");

  if (user?.role !== "owner") {
    return (
      <div className="alert-warning flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <span>Only owners can manage merchant settings.</span>
      </div>
    );
  }

  if (isLoading || !merchant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-slate-500">Loading merchant…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert-error">{getApiError(error)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
            <Store className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="page-title">Merchant Settings</h1>
            <p className="text-sm text-slate-500">Update your merchant profile and branding</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((data) => {
          setMessage(null);
          update.mutate({
            name: data.name || undefined,
            logo: data.logo || null,
            has_color_1: data.has_color_1 || null,
            has_color_2: data.has_color_2 || null,
            status: data.status || undefined,
          });
        })}
        className="max-w-2xl space-y-5"
      >
        {/* Feedback */}
        {message && (
          <div className={message.type === "ok" ? "alert-success" : "alert-error"}>
            {message.text}
          </div>
        )}

        {/* General info */}
        <div className="form-card space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Store className="h-4 w-4 text-slate-400" />
            <h2 className="section-title">General Information</h2>
          </div>

          <div>
            <label className="label">Merchant name</label>
            <input
              type="text"
              className="input-base"
              placeholder="e.g. My Restaurant"
              {...register("name")}
            />
          </div>

          <div>
            <label className="label">
              <span className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Logo URL
              </span>
            </label>
            <input
              type="url"
              className="input-base"
              placeholder="https://example.com/logo.png"
              {...register("logo")}
            />
            <p className="mt-1.5 text-xs text-slate-400">Optional. Paste a direct image URL for your logo.</p>
          </div>
        </div>

        {/* Branding colors */}
        <div className="form-card space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Palette className="h-4 w-4 text-slate-400" />
            <h2 className="section-title">Brand Colors</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Primary color</label>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 shadow-sm"
                  style={{ backgroundColor: color1 || "#e2e8f0" }}
                />
                <input
                  type="text"
                  className="input-base"
                  placeholder="#0f766e"
                  {...register("has_color_1")}
                />
              </div>
            </div>
            <div>
              <label className="label">Secondary color</label>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 shadow-sm"
                  style={{ backgroundColor: color2 || "#e2e8f0" }}
                />
                <input
                  type="text"
                  className="input-base"
                  placeholder="#14b8a6"
                  {...register("has_color_2")}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">Enter hex values (e.g. #0f766e). Used for your customer-facing menu.</p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={update.isPending}
            className="btn-primary"
          >
            {update.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> Save changes</>
            )}
          </button>
          {message?.type === "ok" && (
            <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>
          )}
        </div>
      </form>
    </div>
  );
}
