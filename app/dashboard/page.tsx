"use client";

import { useAuth } from "@/contexts";
import {
  ClipboardList,
  UtensilsCrossed,
  Store,
  Users,
  TrendingUp,
  ArrowUpRight,
  MapPin,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface QuickLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  iconBg: string;
}

function QuickLink({ href, icon: Icon, label, description, color, iconBg }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="card group flex items-center gap-4 p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-500" />
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const isManager = user?.role === "manager";

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl border border-teal-100 bg-linear-to-r from-teal-600 to-teal-500 p-6 text-white shadow-sm shadow-teal-200">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-100">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
            <p className="mt-1 text-sm text-teal-100 capitalize">
              {user?.merchant_name}
              {user?.role !== "owner" && user?.branch_name && (
                <> · {user.branch_name}</>
              )}
              {" · "}
              <span className="font-medium">{user?.role}</span>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 sm:mt-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold backdrop-blur">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick access links */}
      <div>
        <h2 className="section-title mb-3">Quick access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/dashboard/orders"
            icon={ClipboardList}
            label="Orders"
            description="View and manage live orders"
            color="text-sky-600"
            iconBg="bg-sky-100"
          />
          <QuickLink
            href="/dashboard/menu"
            icon={UtensilsCrossed}
            label="Menu"
            description="Categories, items and prices"
            color="text-amber-600"
            iconBg="bg-amber-100"
          />
          {(isOwner || isManager) && (
            <QuickLink
              href="/dashboard/menu/modifiers"
              icon={Layers}
              label="Modifiers"
              description="Modifier groups and options"
              color="text-violet-600"
              iconBg="bg-violet-100"
            />
          )}
          {isOwner && (
            <>
              <QuickLink
                href="/dashboard/merchant"
                icon={Store}
                label="Merchant"
                description="Name, logo and branding"
                color="text-teal-600"
                iconBg="bg-teal-100"
              />
              <QuickLink
                href="/dashboard/branches"
                icon={MapPin}
                label="Branches"
                description="Locations and tables"
                color="text-rose-600"
                iconBg="bg-rose-100"
              />
              <QuickLink
                href="/dashboard/users"
                icon={Users}
                label="Users"
                description="Staff accounts and roles"
                color="text-indigo-600"
                iconBg="bg-indigo-100"
              />
            </>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <TrendingUp className="h-4 w-4 text-teal-500 shrink-0" />
          <span>Select a section above to get started. Real-time order updates appear on the Orders page.</span>
        </div>
      </div>
    </div>
  );
}
