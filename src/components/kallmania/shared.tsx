"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/client";
import type { ReactNode } from "react";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status === "APPROVED" && className?.includes("user") ? "APPROVED_USER" : status;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", STATUS_COLORS[status] || STATUS_COLORS.DRAFT, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function StatCard({ label, value, icon, tone = "default", sub }: { label: string; value: ReactNode; icon?: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "info"; sub?: string }) {
  const tones: Record<string, string> = {
    default: "text-slate-100",
    good: "text-emerald-300",
    warn: "text-amber-300",
    bad: "text-rose-300",
    info: "text-[#a99df8]",
  };
  return (
    <div className="k-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", tones[tone])}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, children, actions, className }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("k-card p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="k-section-title text-sm font-bold uppercase tracking-wide">▸ {title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/40 py-10 text-center">
      {icon && <div className="mb-2 text-slate-500">{icon}</div>}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Field({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-300">
        {label} {required && <span className="text-rose-400">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputCls = "border-slate-600/50 bg-[#15202e]/60 text-slate-100 placeholder:text-slate-500";
