"use client";

import { useCallback, useEffect, useState } from "react";
import AuthView from "@/components/kallmania/auth-view";
import Shell, { navForRole } from "@/components/kallmania/shell";
import Dashboard from "@/components/kallmania/dashboard";
import AgentBpoReportForm from "@/components/kallmania/report-forms";
import { TechReportForm, SocialReportForm } from "@/components/kallmania/dept-report-forms";
import SupervisorReportForm from "@/components/kallmania/supervisor-form";
import UploadView from "@/components/kallmania/upload-view";
import TasksView from "@/components/kallmania/tasks-view";
import { MyReportsView, ReviewView } from "@/components/kallmania/reports-view";
import ReportsArchiveView from "@/components/kallmania/archive-view";
import ConsolidatedView from "@/components/kallmania/consolidated-view";
import { AdminUsersView, KpiConfigView, AuditView, NotificationsView, UploadsAdminView } from "@/components/kallmania/admin-views";
import { api, todayISO, type SessionUser } from "@/lib/client";
import { Loader2 } from "lucide-react";

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState("dashboard");
  const [focusReportId, setFocusReportId] = useState<string | null>(null);
  const [supervisorDate, setSupervisorDate] = useState(todayISO());
  const [reportDate, setReportDate] = useState(todayISO());
  const [unread, setUnread] = useState(0);

  // Bootstrap (seeds admin on first run) + session restore
  useEffect(() => {
    (async () => {
      try {
        await api("/api/bootstrap");
      } catch { /* non-fatal */ }
      try {
        const { user } = await api<{ user: SessionUser | null }>("/api/auth");
        setUser(user && user.status === "APPROVED" ? user : null);
      } catch { /* not logged in */ }
      setBooted(true);
    })();
  }, []);

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
    if (v === "daily-report" || v === "upload") setReportDate(todayISO());
    if (v === "supervisor-report") setSupervisorDate(todayISO());
    if (v === "review" && data) setFocusReportId(data);
    setView(v);
  };

  const handleAuthed = (u: SessionUser) => {
    setUser(u);
    setView("dashboard");
  };

  const logout = async () => {
    await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    setUser(null);
    setView("dashboard");
  };

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
      case "daily-report":
        if (user.role === "DEVELOPER") return <TechReportForm user={user} date={reportDate} />;
        if (user.role === "SOCIAL_MEDIA") return <SocialReportForm user={user} date={reportDate} />;
        return <AgentBpoReportForm user={user} date={reportDate} onDone={refreshUnread} />;
      case "supervisor-report":
        return <SupervisorReportForm user={user} date={supervisorDate} onExport={exportReport} />;
      case "upload":
        return <UploadView user={user} defaultDate={reportDate} />;
      case "tasks":
        return <TasksView user={user} managerMode={false} />;
      case "team-tasks":
        return <TasksView user={user} managerMode />;
      case "my-reports":
        return <MyReportsView user={user} />;
      case "review":
        return <ReviewView user={user} focusReportId={focusReportId} />;
      case "archive":
        return <ReportsArchiveView user={user} />;
      case "consolidated":
        return <ConsolidatedView user={user} onOpenSupervisorForm={(d) => { setSupervisorDate(d); setView("supervisor-report"); }} />;
      case "uploads-admin":
        return <UploadsAdminView />;
      case "admin-users":
        return <AdminUsersView />;
      case "kpi-config":
        return <KpiConfigView />;
      case "audit":
        return <AuditView />;
      case "notifications":
        return <NotificationsView user={user} onNavigate={navigate} />;
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
