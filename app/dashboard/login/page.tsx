"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts";
import { getApiError } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginForm {
  name: string;
  password: string;
}

export default function DashboardLoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.name, data.password);
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-teal-900 px-16 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-teal-500/10" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-teal-500/8" />
        <div className="relative text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500/20 ring-1 ring-teal-400/30">
            <span className="text-4xl font-black text-teal-400">T</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Tably Dashboard</h1>
          <p className="mt-3 text-base text-slate-400 max-w-xs mx-auto leading-relaxed">
            Manage your orders, menu and branches from one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Orders", value: "Live" },
              { label: "Menu", value: "Full" },
              { label: "Teams", value: "Multi" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <p className="text-xl font-bold text-teal-400">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white text-2xl font-black shadow-lg shadow-teal-600/30">
              T
            </div>
            <p className="mt-3 text-xl font-bold text-slate-800">Tably</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="alert-error flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-red-500">!</span>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="label">Username</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="username"
                  className="input-base"
                  placeholder="Enter your username"
                  {...register("name", { required: "Required" })}
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="input-base pr-11"
                    placeholder="Enter your password"
                    {...register("password", { required: "Required" })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center py-2.5 text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Dashboard. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
