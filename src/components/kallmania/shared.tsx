"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/client";
import { type ReactNode, useState } from "react";
import { CheckCircle2, Hourglass, Undo2, ShieldCheck, Eye, EyeOff } from "lucide-react";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status === "APPROVED" && className?.includes("user") ? "APPROVED_USER" : status;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", STATUS_COLORS[status] || STATUS_COLORS.DRAFT, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

/** Password input with a show/hide eye toggle so users can verify what they typed. */
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} {...props} className={cn(className, "pr-10")} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-300"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
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
          <h3 className="k-section-title text-[15px] font-bold">{title}</h3>
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

/** Glass input style — shared by every form in the app */
export const inputCls = "border-white/12 bg-white/[0.055] text-slate-100 placeholder:text-slate-500 focus-visible:ring-[#6c5ce7]/30";

/**
 * Submission state machine banner.
 * SUBMITTED → "submitted & awaiting approval"   (form is locked)
 * REJECTED  → "returned for correction" + feedback (form editable again)
 * APPROVED  → "approved & finalized"           (form locked)
 */
export function ReportStateBanner({
  status, ref: reportRef, feedback, reviewer, reviewedAt,
}: {
  status: string;
  ref: string;
  feedback?: string | null;
  reviewer?: string | null;
  reviewedAt?: string | null;
}) {
  if (status === "SUBMITTED") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/14 via-emerald-500/6 to-transparent p-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-emerald-400/16 blur-3xl" />
        <div className="flex items-start gap-4">
          <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/22 ring-1 ring-emerald-300/40">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/12" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-200">
              Report submitted successfully
              <span className="rounded-full bg-emerald-500/18 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-100 ring-1 ring-emerald-300/30">{reportRef}</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-100/85">
              <Hourglass className="h-3.5 w-3.5" />
              Awaiting approval — your supervisor has been notified and will review this report shortly.
            </p>
            <p className="mt-1 text-[11px] text-emerald-100/60">
              This report is now locked for editing. You will receive a notification once it is approved or returned for correction.
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/14 via-amber-500/6 to-transparent p-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-amber-400/14 blur-3xl" />
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-300/40">
            <Undo2 className="h-6 w-6 text-amber-300" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-amber-200">
              Report returned for correction
              <span className="rounded-full bg-amber-500/18 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-100 ring-1 ring-amber-300/30">{reportRef}</span>
            </p>
            {feedback && <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-amber-400/20 bg-amber-500/8 p-2.5 text-xs text-amber-100">Supervisor feedback: {feedback}</p>}
            <p className="mt-1.5 text-[11px] text-amber-100/70">
              {reviewer ? `Returned by ${reviewer}${reviewedAt ? ` on ${new Date(reviewedAt).toLocaleDateString()}` : ""}. ` : ""}
              Update the report below and submit it again for approval.
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/12 via-sky-500/5 to-transparent p-5 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-300/40">
            <ShieldCheck className="h-6 w-6 text-sky-300" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-sky-200">
              Report approved &amp; finalized
              <span className="rounded-full bg-sky-500/18 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-100 ring-1 ring-sky-300/30">{reportRef}</span>
            </p>
            <p className="mt-1 text-xs text-sky-100/85">
              {reviewer ? `Approved by ${reviewer}${reviewedAt ? ` on ${new Date(reviewedAt).toLocaleDateString()}` : ""}. ` : ""}
              This report is locked and stored online — you can download it any time from My Reports.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
