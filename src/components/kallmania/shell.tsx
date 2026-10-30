"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api, ROLE_LABELS, DEPT_LABELS, type SessionUser } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  FileText, Upload, ListTodo, ClipboardCheck, Layers, Users, Target,
  Bell, LogOut, ScrollText, KeyRound, FolderOpen, FileCog, FileCheck2, Megaphone,
  UserCircle2, Siren, Sun, Moon, ChevronDown, Home, LayoutGrid, BellRing,
} from "lucide-react";
import { EscalationComposer } from "@/components/kallmania/escalation-center";

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function navForRole(role: string): NavItem[] {
  const employeeNav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "notice-board", label: "Notice Board", icon: Megaphone },
    { key: "daily-report", label: "My Daily Report", icon: FileText },
    { key: "upload", label: "Upload Report", icon: Upload },
    { key: "tasks", label: "My Tasks", icon: ListTodo },
    { key: "my-reports", label: "My Reports", icon: FileCheck2 },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "escalations", label: "Escalations", icon: Siren },
    { key: "profile", label: "My Profile", icon: UserCircle2 },
  ];
  // Team leads assign & monitor the tasks of the agents in their centre and
  // configure the individual KPI targets of their own team members.
  if (role === "TEAM_LEAD") {
    employeeNav.splice(5, 0, { key: "team-tasks", label: "Tasks & Assignments", icon: ClipboardCheck }, { key: "kpi-config", label: "KPI Configuration", icon: Target });
  }
  const supervisorNav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "notice-board", label: "Notice Board", icon: Megaphone },
    { key: "review", label: "Review Reports", icon: ClipboardCheck },
    { key: "archive", label: "Reports Archive", icon: FolderOpen },
    { key: "consolidated", label: "Consolidated Report", icon: Layers },
    { key: "supervisor-report", label: "My Daily Report", icon: FileText },
    // Supervisors file their own daily reports as documents too — the upload
    // pipeline reads them (attendance, team KPIs, coaching, escalations …).
    { key: "upload", label: "Upload Report", icon: Upload },
    { key: "team-tasks", label: "Tasks & Assignments", icon: ListTodo },
    { key: "uploads-admin", label: "Uploaded Files", icon: Upload },
    { key: "tl-template", label: "Report Templates", icon: FileCog },
    { key: "kpi-config", label: "KPI Configuration", icon: Target },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "escalations", label: "Escalations", icon: Siren },
    { key: "profile", label: "My Profile", icon: UserCircle2 },
  ];
  const adminNav: NavItem[] = [
    ...supervisorNav,
    { key: "admin-users", label: "User Management", icon: Users },
    { key: "audit", label: "Audit Trail", icon: ScrollText },
    { key: "push-health", label: "Push Health", icon: BellRing },
  ];
  if (role === "ADMIN") return adminNav;
  if (role === "SUPERVISOR") return supervisorNav;
  return employeeNav;
}

/**
 * Former-model nav format: the reports (and the rest) are arranged under
 * headings — "Reports", "Team", "Configuration" — with flat items between.
 * Display-only grouping; navForRole above stays the permission source of truth.
 */
type NavGroup = { kind: "flat"; item: NavItem } | { kind: "group"; label: string; items: NavItem[] };

function pickNav(nav: NavItem[], key: string): NavItem {
  const item = nav.find((n) => n.key === key);
  if (!item) throw new Error(`nav item missing: ${key}`);
  return item;
}

export function navGroupsForRole(role: string, nav: NavItem[]): NavGroup[] {
  const has = (k: string) => nav.some((n) => n.key === k);
  const pickAll = (keys: string[]) => keys.filter(has).map((k) => pickNav(nav, k));
  const groups: NavGroup[] = [];

  if (role === "ADMIN" || role === "SUPERVISOR") {
    const reports = pickAll(["review", "archive", "consolidated", "upload"]);
    if (reports.length) groups.push({ kind: "group", label: "Reports", items: reports });
    const team = pickAll(role === "ADMIN" ? ["admin-users", "uploads-admin"] : ["uploads-admin"]);
    if (team.length) groups.push({ kind: "group", label: "Team", items: team });
    if (has("team-tasks")) groups.push({ kind: "flat", item: pickNav(nav, "team-tasks") });
    const config = pickAll(role === "ADMIN" ? ["kpi-config", "tl-template", "audit", "push-health"] : ["kpi-config", "tl-template"]);
    if (config.length) groups.push({ kind: "group", label: "Configuration", items: config });
    if (has("supervisor-report")) groups.push({ kind: "flat", item: pickNav(nav, "supervisor-report") });
    if (has("notice-board")) groups.push({ kind: "flat", item: pickNav(nav, "notice-board") });
    return groups;
  }

  const reports = pickAll(["my-reports", "upload"]);
  if (reports.length) groups.push({ kind: "group", label: "Reports", items: reports });
  if (has("tasks")) groups.push({ kind: "flat", item: pickNav(nav, "tasks") });
  if (role === "TEAM_LEAD" && has("team-tasks")) groups.push({ kind: "flat", item: pickNav(nav, "team-tasks") });
  if (role === "TEAM_LEAD" && has("kpi-config")) groups.push({ kind: "group", label: "Configuration", items: pickAll(["kpi-config"]) });
  if (has("daily-report")) groups.push({ kind: "flat", item: pickNav(nav, "daily-report") });
  if (has("notice-board")) groups.push({ kind: "flat", item: pickNav(nav, "notice-board") });
  return groups;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme !== "light";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10 hover:text-[#eda06a]"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Sun className="h-4 w-4" />}
    </Button>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0a267] via-[#e8873a] to-[#d97a35] font-black text-[#1a120b] shadow-[0_8px_24px_-6px_rgba(232,135,58,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]">
        K
      </div>
      <p className="truncate text-base font-bold leading-none text-white">Kallmania</p>
    </div>
  );
}

export default function Shell({
  user, view, onNavigate, unread, children, onLogout,
}: {
  user: SessionUser;
  view: string;
  onNavigate: (v: string) => void;
  unread: number;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const nav = navForRole(user.role);
  const groups = navGroupsForRole(user.role, nav);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (v: string) => {
    setMenuOpen(false);
    if (v === "__logout__") { onLogout(); return; }
    onNavigate(v);
  };

  // Escape closes the pop-out navigation menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const pillCls = (active: boolean) =>
    cn(
      "k-nav-item flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold",
      active ? "k-nav-active" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
    );

  const IconCluster = (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEscalateOpen(true)}
        title="Notify / escalate"
        className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.05] text-[#eda06a] hover:bg-white/10"
      >
        <Siren className="h-4 w-4" />
      </Button>
      <ThemeToggle />
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10 hover:text-slate-100"
        onClick={() => handleNavigate("notifications")}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e8833a] px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5b4636] to-[#3a2c21] text-[11px] font-bold text-[#f0b285] ring-1 ring-white/15 transition hover:opacity-90"
            title={user.fullName}
          >
            {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>
            <p className="text-xs font-semibold">{user.fullName}</p>
            <p className="mt-0.5 text-[10px] font-normal text-slate-500">{user.email}</p>
            <p className="mt-1 text-[10px] font-normal text-[#c2641f] dark:text-[#eda06a]">{ROLE_LABELS[user.role]} · {DEPT_LABELS[user.department]}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => handleNavigate("profile")}>
            <UserCircle2 className="mr-2 h-4 w-4" /> My profile
          </DropdownMenuItem>
          <ChangePasswordItem />
          <DropdownMenuItem onClick={onLogout} className="text-rose-500 focus:text-rose-500 dark:text-rose-300 dark:focus:text-rose-300">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Pop-out navigation menu — opens from the grid icon next to "Dashboard
  // Overview". Every page of the user's role, arranged under headings
  // (Overview / Reports / Team / Configuration / Workspace) to match the
  // former-model format. The attached horizontal bar above stays as-is.
  const groupedKeys = new Set(groups.filter((g) => g.kind === "group").flatMap((g) => g.items.map((i) => i.key)));
  const overviewKeys = ["dashboard", "notifications", "profile"];
  const overviewItems = nav.filter((n) => overviewKeys.includes(n.key));
  const workspaceItems = nav.filter((n) => !groupedKeys.has(n.key) && !overviewKeys.includes(n.key));
  const menuSections: { label: string; items: NavItem[] }[] = [
    ...(overviewItems.length ? [{ label: "Overview", items: overviewItems }] : []),
    ...groups.filter((g) => g.kind === "group").map((g) => ({ label: g.label, items: g.items })),
    ...(workspaceItems.length ? [{ label: "Workspace", items: workspaceItems }] : []),
  ];

  const NavMenuPanel = menuOpen ? (
    <>
      {/* Invisible click-catcher below the header (sits under it, z-30 < z-40) */}
      <div className="fixed inset-0 z-30" aria-hidden onClick={() => setMenuOpen(false)} />
      <div
        role="menu"
        aria-label="Navigation menu"
        className="k-card absolute inset-x-3 top-full z-40 mt-1.5 max-h-[calc(100vh-9rem)] overflow-y-auto p-4 sm:inset-x-5 sm:p-5"
      >
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {menuSections.map((s) => (
            <div key={s.label} className="min-w-0">
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
              <div className="space-y-0.5">
                {s.items.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.key;
                  return (
                    <button
                      key={item.key}
                      role="menuitem"
                      onClick={() => handleNavigate(item.key)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition",
                        active
                          ? "bg-[#e8935a]/15 font-semibold text-[#c2641f] dark:text-[#f0b285]"
                          : "text-slate-300 hover:bg-white/[0.06] hover:text-slate-100",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#c2641f] dark:text-[#eda06a]" : "text-slate-500")} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.key === "notifications" && unread > 0 && (
                        <span className="rounded-full bg-[#e8833a] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  ) : null;

  // Horizontal nav bar — attached under the brand row, always visible;
  // the grid icon pops the full navigation menu out below it.
  const NavBar = (
    <nav className="k-nav-bar flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Menu icon attached to the dashboard — click brings out the nav menu */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full px-3 py-2 transition hover:bg-white/[0.06]",
          menuOpen && "bg-white/[0.06]",
        )}
        title={menuOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        <LayoutGrid className="h-4 w-4 text-[#c2641f] dark:text-[#eda06a]" />
        <span className="whitespace-nowrap text-[13px] font-bold text-slate-200">Dashboard Overview</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition-transform duration-200", menuOpen && "rotate-180")} />
      </button>
      {/* Home pill */}
      <button onClick={() => handleNavigate("dashboard")} className={pillCls(view === "dashboard")}>
        <Home className={cn("h-4 w-4", view === "dashboard" ? "text-[#1a120b]" : "text-slate-500")} />
        <span className="whitespace-nowrap">Home</span>
      </button>
      {/* Grouped + flat items */}
      {groups.map((g) =>
        g.kind === "flat" ? (
          (() => {
            const Icon = g.item.icon;
            const active = view === g.item.key;
            return (
              <button key={g.item.key} onClick={() => handleNavigate(g.item.key)} className={pillCls(active)}>
                <Icon className={cn("h-4 w-4", active ? "text-[#1a120b]" : "text-slate-500")} />
                <span className="whitespace-nowrap">{g.item.label}</span>
                {g.item.key === "notifications" && unread > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", active ? "bg-[#1a120b] text-[#f0b285]" : "bg-[#e8833a] text-white")}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })()
        ) : (
          (() => {
            const groupActive = g.items.some((i) => i.key === view);
            return (
              <DropdownMenu key={g.label}>
                <DropdownMenuTrigger asChild>
                  <button className={cn(pillCls(groupActive), groupActive && "text-[#c2641f] dark:text-[#eda06a]")}>
                    <span className="whitespace-nowrap">{g.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-56">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {g.label}
                  </DropdownMenuLabel>
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.key;
                    return (
                      <DropdownMenuItem
                        key={item.key}
                        onSelect={() => handleNavigate(item.key)}
                        className={cn(
                          "gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
                          active && "bg-[#e8935a]/15 font-semibold text-[#c2641f] dark:text-[#f0b285]",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-[#c2641f] dark:text-[#eda06a]" : "text-slate-500")} />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()
        ),
      )}
    </nav>
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Aurora background */}
      <div className="k-aurora" aria-hidden />

      {/* ── Clasy top chrome ── */}
      <header className="k-glass-chrome sticky top-0 z-40 border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <button onClick={() => handleNavigate("dashboard")} className="min-w-0" title="Home">
            <BrandMark />
          </button>
          {IconCluster}
        </div>
        {/* Attached horizontal nav bar — every role, every screen size */}
        <div className="relative mx-auto w-full max-w-[1600px] px-3 pb-2.5 sm:px-5">
          {NavBar}
          {NavMenuPanel}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">{children}</main>
      <footer className="mt-auto border-t border-white/[0.06] px-6 py-3 text-center text-[11px] text-slate-600">
        Kallmania · SBTS Group Global
      </footer>

      <EscalationComposer user={user} open={escalateOpen} setOpen={setEscalateOpen} />
    </div>
  );
}

function ChangePasswordItem() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
        <KeyRound className="mr-2 h-4 w-4" /> Change password
      </DropdownMenuItem>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => { setOpen(false); setMsg(null); setErr(null); setForm({ currentPassword: "", newPassword: "" }); }}>
          <div className="k-card w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-white">Change password</p>
            <Input type="password" placeholder="Current password" className={cn("border-white/12 bg-white/[0.055] text-slate-100")} value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
            <Input type="password" placeholder="New password (min 6)" className={cn("border-white/12 bg-white/[0.055] text-slate-100")} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            {err && <p className="text-xs text-rose-400">{err}</p>}
            {msg && <p className="text-xs text-emerald-400">{msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setMsg(null); setErr(null); setForm({ currentPassword: "", newPassword: "" }); }}>Cancel</Button>
              <Button size="sm" className="k-btn-primary" onClick={async () => {
                setErr(null); setMsg(null);
                try {
                  await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "changePassword", ...form }) });
                  setMsg("Password changed successfully.");
                  setTimeout(() => setOpen(false), 900);
                } catch (e) { setErr((e as Error).message); }
              }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
