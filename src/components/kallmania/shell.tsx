"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api, ROLE_LABELS, DEPT_LABELS, type SessionUser } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, FileText, Upload, ListTodo, ClipboardCheck, Layers, Users, Target,
  Bell, LogOut, Menu, ScrollText, KeyRound, FolderOpen, FileCog, FileCheck2, Megaphone,
  UserCircle2, Siren, Sun, Moon,
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
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "notice-board", label: "Notice Board", icon: Megaphone },
    { key: "daily-report", label: "Daily Report", icon: FileText },
    { key: "upload", label: "Upload Report", icon: Upload },
    { key: "tasks", label: "My Tasks", icon: ListTodo },
    { key: "my-reports", label: "My Reports", icon: FileCheck2 },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "profile", label: "My Profile", icon: UserCircle2 },
  ];
  // Team leads assign & monitor the tasks of the agents in their centre
  if (role === "TEAM_LEAD") {
    employeeNav.splice(5, 0, { key: "team-tasks", label: "Tasks & Assignments", icon: ClipboardCheck });
  }
  const supervisorNav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "notice-board", label: "Notice Board", icon: Megaphone },
    { key: "review", label: "Review Reports", icon: ClipboardCheck },
    { key: "archive", label: "Reports Archive", icon: FolderOpen },
    { key: "consolidated", label: "Consolidated Report", icon: Layers },
    { key: "supervisor-report", label: "My Daily Report", icon: FileText },
    { key: "team-tasks", label: "Tasks & Assignments", icon: ListTodo },
    { key: "uploads-admin", label: "Uploaded Files", icon: Upload },
    { key: "tl-template", label: "TL Report Template", icon: FileCog },
    { key: "kpi-config", label: "KPI Configuration", icon: Target },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "profile", label: "My Profile", icon: UserCircle2 },
  ];
  const adminNav: NavItem[] = [
    ...supervisorNav,
    { key: "admin-users", label: "User Management", icon: Users },
    { key: "audit", label: "Audit Trail", icon: ScrollText },
  ];
  if (role === "ADMIN") return adminNav;
  if (role === "SUPERVISOR") return supervisorNav;
  return employeeNav;
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
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-none text-white">Kallmania</p>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-500">SBTS Group Global</p>
      </div>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const handleNavigate = (v: string) => {
    if (v === "__logout__") { onLogout(); return; }
    onNavigate(v);
    setMobileOpen(false);
  };

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
          <button className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-1.5 pr-3 backdrop-blur transition hover:bg-white/10" title={user.fullName}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#5b4636] to-[#3a2c21] text-[10px] font-bold text-[#f0b285] ring-1 ring-white/15">
              {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-200 sm:block">{user.fullName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-white/10 bg-[#17171c]/95 text-slate-200 backdrop-blur-xl">
          <DropdownMenuLabel>
            <p className="text-xs font-semibold">{user.fullName}</p>
            <p className="mt-0.5 text-[10px] font-normal text-slate-400">{user.email}</p>
            <p className="mt-1 text-[10px] font-normal text-[#eda06a]">{ROLE_LABELS[user.role]} · {DEPT_LABELS[user.department]}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onSelect={() => handleNavigate("profile")} className="focus:bg-white/10">
            <UserCircle2 className="mr-2 h-4 w-4" /> My profile
          </DropdownMenuItem>
          <ChangePasswordItem />
          <DropdownMenuItem onClick={onLogout} className="text-rose-300 focus:text-rose-300">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const PillNav = ({ onPick }: { onPick?: (v: string) => void }) => (
    <nav className="flex flex-1 items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = view === item.key;
        return (
          <button
            key={item.key}
            onClick={() => (onPick ? onPick(item.key) : handleNavigate(item.key))}
            className={cn(
              "k-nav-item flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold",
              active ? "k-nav-active" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-[#1a120b]" : "text-slate-500")} />
            <span className="whitespace-nowrap">{item.label}</span>
            {item.key === "notifications" && unread > 0 && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", active ? "bg-[#1a120b] text-[#f0b285]" : "bg-[#e8833a] text-white")}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Aurora background */}
      <div className="k-aurora" aria-hidden />

      {/* ── Clasy top chrome ── */}
      <header className="k-glass-chrome sticky top-0 z-40 border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:bg-white/10 lg:hidden" title="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-0 bg-[#131316]/95 p-0 [&>button]:text-slate-300">
                <div className="flex h-full flex-col">
                  <div className="px-4 py-5"><BrandMark /></div>
                  <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
                    {nav.map((item) => {
                      const Icon = item.icon;
                      const active = view === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleNavigate(item.key)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
                            active ? "k-nav-active" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-white/[0.07] p-3">
                    <p className="px-1 text-xs font-semibold text-slate-200">{user.fullName}</p>
                    <p className="px-1 text-[10px] text-slate-500">{ROLE_LABELS[user.role]}</p>
                    <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-rose-300 hover:bg-white/10" onClick={onLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <button onClick={() => handleNavigate("dashboard")} className="min-w-0" title="Home">
              <BrandMark />
            </button>
          </div>
          {IconCluster}
        </div>
        {/* Horizontal pill nav — desktop */}
        <div className="mx-auto hidden w-full max-w-[1600px] items-center gap-3 px-5 pb-2.5 lg:flex">
          <PillNav />
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
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }} className="focus:bg-white/10">
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
