"use client";

import { useCallback, useEffect, useState } from "react";
import AuthView from "@/components/kallmania/auth-view";
import Shell, { navForRole } from "@/components/kallmania/shell";
import Dashboard from "@/components/kallmania/dashboard";
import AgentBpoReportForm from "@/components/kallmania/report-forms";
import { SocialReportForm } from "@/components/kallmania/dept-report-forms";
import WebTeamReportForm from "@/components/kallmania/web-team-report";
import SupervisorReportForm from "@/components/kallmania/supervisor-form";
import TeamLeadReportForm, { TeamLeadTemplateEditor } from "@/components/kallmania/team-lead-form";
import UploadView from "@/components/kallmania/upload-view";
import TasksView from "@/components/kallmania/tasks-view";
import { MyReportsView, ReviewView } from "@/components/kallmania/reports-view";
import ReportsArchiveView from "@/components/kallmania/archive-view";
import ConsolidatedView from "@/components/kallmania/consolidated-view";
import { AdminUsersView, KpiConfigView, AuditView, NotificationsView, UploadsAdminView, PushAdminView } from "@/components/kallmania/admin-views";
import { EscalationsPanel } from "@/components/kallmania/escalation-center";
import NoticeBoardView from "@/components/kallmania/notice-board";
import ProfileView from "@/components/kallmania/profile-view";
import { api, todayISO, type SessionUser } from "@/lib/client";
import { listenForPushNavigation } from "@/lib/push-client";
import { Loader2 } from "lucide-react";

// ── Reload persistence (hash routing) ──
// The current section lives in the URL hash (e.g. #/kpi-config, #/review/<id>)
// so a browser refresh restores it instead of bouncing back to the dashboard.
// replaceState keeps the browser history clean (back still leaves the app).
function readHash(): { view: string; data: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  if (!raw) return null;
  const slash = raw.indexOf("/");
  const view = slash === -1 ? raw : raw.slice(0, slash);
  const data = slash === -1 ? null : raw.slice(slash + 1) || null;
  return view ? { view: decodeURIComponent(view), data: data ? decodeURIComponent(data) : null } : null;
}
function writeHash(view: string, data?: string) {
  try {
    if (typeof window === "undefined") return;
    const hash = data ? `#/${view}/${data}` : `#/${view}`;
    window.history.replaceState(null, "", hash);
  } catch { /* ignore */ }
}
function clearHash() {
  try {
    if (typeof window === "undefined") return;
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch { /* ignore */ }
}

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState("dashboard");
  const [focusReportId, setFocusReportId] = useState<string | null>(null);
  // Precise draft/report resume: when navigating to the daily-report form with
  // "<date>@<reportId>" the form opens exactly that record (a saved draft can
  // coexist with a submitted report for the same day — the date alone is ambiguous).
  const [focusFormReportId, setFocusFormReportId] = useState<string | null>(null);
  // Deep-linked escalation thread (notifications → "escalations" view with id).
  const [focusEscalationId, setFocusEscalationId] = useState<string | null>(null);
  const [supervisorDate, setSupervisorDate] = useState(todayISO());
  const [reportDate, setReportDate] = useState(todayISO());
  const [unread, setUnread] = useState(0);

  // Bootstrap (seeds admin on first run) + session restore — run in PARALLEL:
  // bootstrap is idempotent seeding and session restore does not depend on it,
  // so awaiting them sequentially just added a full server round-trip to every
  // page load / reload before the UI could even check who is logged in.
  useEffect(() => {
    (async () => {
      const bootstrap = api("/api/bootstrap").catch(() => null); // non-fatal
      try {
        const { user } = await api<{ user: SessionUser | null }>("/api/auth");
        const restored = user && user.status === "APPROVED" ? user : null;
        setUser(restored);
        // Reload persistence: land the user back in the section they were in.
        const h = readHash();
        if (restored && h) {
          if (h.view === "review" && h.data) setFocusReportId(h.data);
          if (h.view === "daily-report" && /^\d{4}-\d{2}-\d{2}(@\S+)?$/.test(h.data || "")) {
            const [d, rid] = (h.data as string).split("@");
            setReportDate(d);
            setFocusFormReportId(rid || null);
          }
          setView(h.view);
        } else if (!restored) {
          clearHash();
        }
      } catch { /* not logged in */ }
      await bootstrap; // still awaited before clearing the boot splash
      setBooted(true);
    })();
  }, []);

  // If the persisted view is not on this role's nav (stale hash, role change),
  // fall back to the dashboard and clean the URL.
  useEffect(() => {
    if (!user || !booted) return;
    const allowed = navForRole(user.role).map((n) => n.key);
    if (!allowed.includes(view)) {
      setView("dashboard");
      clearHash();
    }
  }, [user, booted, view]);

  // Poll unread count
  const refreshUnread = useCallback(() => {
    if (!user) return;
    api<{ unreadCount: number }>("/api/notifications?unread=1").then(({ unreadCount }) => setUnread(unreadCount)).catch(() => {});
  }, [user]);

  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    return () => clearInterval(t);
  }, [refreshUnread, view]);

  const navigate = (v: string, data?: string) => {
    setFocusReportId(null);
    setFocusEscalationId(null);
    // "daily-report/<YYYY-MM-DD>" opens the form pre-loaded on that report's
    // date; "daily-report/<YYYY-MM-DD>@<reportId>" opens exactly that record
    // (used by My Reports / My Drafts → Continue editing). Plain daily-report
    // resets to today.
    if (v === "daily-report") {
      const raw = data || "";
      const at = raw.indexOf("@");
      const datePart = at === -1 ? raw : raw.slice(0, at);
      const idPart = at === -1 ? null : raw.slice(at + 1) || null;
      setReportDate(/^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : todayISO());
      setFocusFormReportId(idPart);
    } else if (v === "upload") {
      setReportDate(todayISO());
      setFocusFormReportId(null);
    }
    if (v === "supervisor-report") setSupervisorDate(/^\d{4}-\d{2}-\d{2}$/.test(data || "") ? (data as string) : todayISO());
    if (v === "review" && data) setFocusReportId(data);
    // Escalation notifications deep-link straight into the thread.
    if (v === "escalations" && data) setFocusEscalationId(data);
    setView(v);
    writeHash(v, data);
  };

  const handleAuthed = (u: SessionUser) => {
    setUser(u);
    setView("dashboard");
    clearHash();
  };

  const logout = async () => {
    await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    setUser(null);
    setView("dashboard");
    clearHash();
  };

  // Browser push: silent service-worker registration once logged in (permission
  // is requested ONLY from the explicit Enable action in Profile), plus routing
  // for notifications clicked while an app tab is already open.
  useEffect(() => {
    if (!user) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    const cleanup = listenForPushNavigation((url) => {
      const raw = url.replace(/^#\/?/, "");
      const slash = raw.indexOf("/");
      const view = slash === -1 ? raw : raw.slice(0, slash);
      const data = slash === -1 ? undefined : raw.slice(slash + 1) || undefined;
      if (view) navigate(view, data);
    });
    return cleanup;
  }, [user?.id]);

  const exportReport = (id: string) => window.open(`/api/export?format=docx&id=${id}`, "_blank");

  if (!booted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="k-aurora" aria-hidden />
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-[#8b7ff5]" />
          <span className="text-sm">Loading Kallmania…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView onAuthed={handleAuthed} />;
  }

  const allowed = navForRole(user.role).map((n) => n.key);
  const activeView = allowed.includes(view) ? view : "dashboard";

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard user={user} onNavigate={navigate} />;
      case "notice-board":
        return <NoticeBoardView user={user} />;
      case "daily-report":
        if (user.role === "TEAM_LEAD") return <TeamLeadReportForm user={user} date={reportDate} focusId={focusFormReportId} />;
        if (user.role === "DEVELOPER") return <WebTeamReportForm user={user} date={reportDate} focusId={focusFormReportId} />;
        if (user.role === "SOCIAL_MEDIA") return <SocialReportForm user={user} date={reportDate} focusId={focusFormReportId} />;
        return <AgentBpoReportForm user={user} date={reportDate} focusId={focusFormReportId} onDone={refreshUnread} variant={user.team === "INBOUND" ? "inbound" : "outbound"} />;
      case "supervisor-report":
        return <SupervisorReportForm user={user} date={supervisorDate} onExport={exportReport} />;
      case "tl-template":
        return <TeamLeadTemplateEditor />;
      case "upload":
        return <UploadView user={user} defaultDate={reportDate} />;
      case "tasks":
        return <TasksView user={user} managerMode={false} />;
      case "team-tasks":
        return <TasksView user={user} managerMode />;
      case "my-reports":
        return <MyReportsView user={user} onNavigate={navigate} />;
      case "review":
        return <ReviewView user={user} focusReportId={focusReportId} />;
      case "archive":
        return <ReportsArchiveView user={user} />;
      case "consolidated":
        return <ConsolidatedView user={user} onOpenSupervisorForm={(d) => { setSupervisorDate(d); setView("supervisor-report"); }} />;
      case "uploads-admin":
        return <UploadsAdminView />;
      case "admin-users":
        return <AdminUsersView user={user} />;
      case "kpi-config":
        return <KpiConfigView user={user} />;
      case "audit":
        return <AuditView />;
      case "push-health":
        return <PushAdminView />;
      case "notifications":
        return <NotificationsView user={user} onNavigate={navigate} />;
      case "escalations":
        return <EscalationsPanel user={user} focusId={focusEscalationId} />;
      case "profile":
        return <ProfileView user={user} />;
      default:
        return <Dashboard user={user} onNavigate={navigate} />;
    }
  };

  // Date strip for report-related views
  const showDateStrip = ["daily-report", "upload", "supervisor-report"].includes(activeView);

  return (
    <Shell user={user} view={activeView} onNavigate={navigate} unread={unread} onLogout={logout}>
      {showDateStrip && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Reporting date:</span>
          <input
            type="date"
            value={activeView === "supervisor-report" ? supervisorDate : reportDate}
            onChange={(e) => (activeView === "supervisor-report" ? setSupervisorDate(e.target.value) : setReportDate(e.target.value))}
            className="h-8 rounded-lg border border-white/12 bg-white/[0.055] px-2 text-xs text-slate-200 backdrop-blur"
          />
          {activeView !== "upload" && (
            <button
              onClick={() => (activeView === "supervisor-report" ? setSupervisorDate(todayISO()) : setReportDate(todayISO()))}
              className="k-btn-glass rounded-full px-3 py-1 text-[11px] text-slate-300"
            >
              Today
            </button>
          )}
        </div>
      )}
      {renderView()}
    </Shell>
  );
}
