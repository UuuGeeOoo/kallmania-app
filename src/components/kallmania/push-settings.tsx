"use client";

/**
 * Browser push notification settings (Profile → "Browser notifications").
 * Implements the full enable/disable/test flow with explicit states:
 * unsupported · not configured (admins) · permission pending/denied ·
 * unsubscribed · subscribed · registration failed — plus per-device list and
 * category preferences (administrator-defined mandatory categories locked).
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/kallmania/shared";
import { useToast } from "@/hooks/use-toast";
import {
  disableBrowserNotifications, enableBrowserNotifications, getPushStatus, sendTestPush,
  type PushState, type PushSubscriptionDTO,
} from "@/lib/push-client";
import { api } from "@/lib/client";
import { Bell, BellOff, Loader2, MonitorSmartphone, RefreshCw, Send, ShieldCheck } from "lucide-react";

interface CategoriesDTO { categories: { type: string; label: string }[]; mandatory: string[]; prefs: { pushEnabled: boolean; categories: Record<string, boolean> } }

const STATE_COPY: Record<string, { title: string; detail: string; tone: string }> = {
  unsupported: { title: "Browser not supported", detail: "This browser cannot receive web push notifications. Use a current version of Chrome, Edge, Firefox or Safari (iOS requires adding the site to the Home Screen on iOS 16.4+).", tone: "text-slate-300" },
  "not-configured": { title: "Push not set up yet", detail: "Server push keys are not configured. An administrator needs to run the one-time push setup — nothing is wrong with this browser.", tone: "text-amber-300" },
  "permission-pending": { title: "Not enabled yet", detail: "Click Enable and your browser will ask for permission to show notifications.", tone: "text-slate-300" },
  "permission-denied": { title: "Permission denied", detail: "Notifications are blocked for this site. To enable them again, open the padlock / site-settings icon in the address bar, set Notifications to Allow, then reload this page.", tone: "text-rose-300" },
  unsubscribed: { title: "Not enabled", detail: "Browser notifications are currently off on this device.", tone: "text-slate-300" },
  subscribed: { title: "Notifications enabled", detail: "This browser is registered — you will receive push notifications even when Kallmania is in the background.", tone: "text-emerald-300" },
  "registration-failed": { title: "Registration failed", detail: "", tone: "text-rose-300" },
};

export default function PushSettings() {
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<"" | "enable" | "disable" | "test">("");
  const [devices, setDevices] = useState<PushSubscriptionDTO[]>([]);
  const [catalog, setCatalog] = useState<CategoriesDTO | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const refresh = useCallback(async () => {
    const [s, list, prefs] = await Promise.all([
      getPushStatus(),
      api<{ subscriptions: PushSubscriptionDTO[] }>("/api/push/subscriptions").catch(() => ({ subscriptions: [] })),
      api<CategoriesDTO>("/api/push/preferences").catch(() => null),
    ]);
    setState(s);
    setDevices(list.subscriptions);
    setCatalog(prefs);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const enable = async () => {
    setBusy("enable");
    try {
      const next = await enableBrowserNotifications();
      setState(next);
      if (next.kind === "subscribed") {
        toast({ title: "Browser notifications enabled", description: "This device will now receive push notifications." });
        // Send nothing automatically — let the user try the Test button.
      } else if (next.kind === "permission-denied") {
        toast({ title: "Permission denied", description: "Allow notifications in the browser site settings, then reload.", variant: "destructive" });
      } else if (next.kind !== "unsupported") {
        toast({ title: STATE_COPY[next.kind]?.title || "Could not enable notifications", description: next.kind === "registration-failed" ? next.reason : "", variant: "destructive" });
      }
      await refresh();
    } finally {
      setBusy("");
    }
  };

  const disable = async () => {
    setBusy("disable");
    try {
      await disableBrowserNotifications();
      toast({ title: "Notifications disabled", description: "This browser will no longer receive push notifications." });
      await refresh();
    } finally {
      setBusy("");
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      const res = await sendTestPush();
      if (res.ok) toast({ title: "Test notification sent", description: res.message });
      else toast({ title: "Test notification failed", description: res.message, variant: "destructive" });
      await refresh();
    } finally {
      setBusy("");
    }
  };

  const setCategory = async (type: string, on: boolean) => {
    if (!catalog) return;
    setSavingPrefs(true);
    try {
      await api("/api/push/preferences", { method: "PATCH", body: JSON.stringify({ categories: { ...catalog.prefs.categories, [type]: on } }) });
      setCatalog({ ...catalog, prefs: { ...catalog.prefs, categories: { ...catalog.prefs.categories, [type]: on } } });
    } catch (e) {
      toast({ title: "Could not save preference", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingPrefs(false);
    }
  };

  const setPushEnabled = async (on: boolean) => {
    if (!catalog) return;
    setSavingPrefs(true);
    try {
      await api("/api/push/preferences", { method: "PATCH", body: JSON.stringify({ pushEnabled: on }) });
      setCatalog({ ...catalog, prefs: { ...catalog.prefs, pushEnabled: on } });
      toast({ title: on ? "Push notifications on" : "Push notifications off", description: on ? undefined : "Mandatory alerts (escalations, report submissions/overdue, notices) are still delivered." });
    } catch (e) {
      toast({ title: "Could not save preference", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingPrefs(false);
    }
  };

  const copy = state ? STATE_COPY[state.kind] ?? STATE_COPY.unsubscribed : null;
  const subscribed = state?.kind === "subscribed";
  const enableBlocked = state?.kind === "unsupported" || state?.kind === "not-configured" || state?.kind === "permission-denied" || state?.kind === "subscribed";

  return (
    <SectionCard
      title="Browser notifications"
      subtitle="Real push notifications on this device — even when Kallmania is in the background or closed (where your browser supports it)"
      className="lg:col-span-3"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6c5ce7]/20 text-[#b3a5ff]">
              {subscribed ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${copy?.tone ?? "text-slate-200"}`}>{copy?.title ?? "Checking…"}</p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {state?.kind === "registration-failed" ? state.reason : copy?.detail}
              </p>
            </div>
          </div>
          {state?.kind === "permission-pending" && (
            <p className="mt-3 rounded-md border border-white/5 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-slate-400">
              Notifications let Kallmania reach you the moment an escalation, report decision, task or notice needs your attention — even with the site closed. Your browser will ask for permission when you click Enable.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={enable} disabled={busy !== "" || enableBlocked || state === null} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
              {busy === "enable" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              {subscribed ? "Re-register this browser" : "Enable browser notifications"}
            </Button>
            <Button onClick={test} disabled={busy !== "" || state?.kind !== "subscribed"} variant="outline">
              {busy === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send test notification
            </Button>
            {subscribed && (
              <Button onClick={disable} disabled={busy !== ""} variant="outline" className="text-rose-300 hover:text-rose-200">
                {busy === "disable" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
                Disable on this browser
              </Button>
            )}
            <Button onClick={refresh} disabled={busy !== ""} variant="ghost" size="icon" title="Refresh status">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Registered devices */}
        <div className="w-full shrink-0 lg:w-80">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300"><MonitorSmartphone className="h-3.5 w-3.5" /> Registered devices ({devices.length})</p>
          {devices.length === 0 ? (
            <p className="rounded-md border border-white/5 bg-white/[0.03] p-2.5 text-[11px] text-slate-500">No browsers registered yet — enable notifications above.</p>
          ) : (
            <ul className="space-y-1.5">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2 text-[11px]">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-200">{d.label}{state?.kind === "subscribed" && d.endpointTail === state.endpointTail ? " — this browser" : ""}</p>
                    <p className="text-slate-500">{d.active ? "Active" : "Inactive (expired)"} · registered {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${d.active ? "bg-emerald-400" : "bg-slate-600"}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Category preferences */}
      {catalog && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-300">Notification categories</p>
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              <Switch checked={catalog.prefs.pushEnabled} onCheckedChange={setPushEnabled} disabled={savingPrefs} />
              Push master switch {catalog.prefs.pushEnabled ? "on" : "off"}
            </label>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.categories.map((c) => {
              const mandatory = catalog.mandatory.includes(c.type);
              const on = mandatory ? true : catalog.prefs.categories[c.type] !== false;
              return (
                <label key={c.type} className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2 text-[11px]">
                  <span className="min-w-0 truncate text-slate-300" title={c.label}>{c.label}</span>
                  {mandatory ? (
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-300" title="Administrators require this alert"><ShieldCheck className="h-3.5 w-3.5" /> Required</span>
                  ) : (
                    <Switch checked={on} onCheckedChange={(v) => setCategory(c.type, v)} disabled={savingPrefs || !catalog.prefs.pushEnabled} />
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Categories marked “Required” are administrator-defined mandatory alerts and cannot be switched off. Devices not receiving pushes: check the browser site permission and that the page has been opened at least once after enabling.</p>
        </div>
      )}
    </SectionCard>
  );
}
