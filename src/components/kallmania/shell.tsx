"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api, ROLE_LABELS, DEPT_LABELS, type NotificationDTO, type SessionUser } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Upload, ListTodo, ClipboardCheck, Layers, Users, Target,
  Bell, LogOut, Menu, ScrollText, Inbox, KeyRound, Home, FolderOpen, PanelLeftClose, PanelLeftOpen, FileCog, FileCheck2, Megaphone, UserCircle2,
} from "lucide-react";

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
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "profile", label: "My Profile", icon: UserCircle2 },
  ];
  const adminNav: NavItem[] = [
    ...supervisorNav.filter((n) => n.key !== "notifications"),
    { key: "admin-users", label: "User Management", icon: Users },
    { key: "kpi-config", label: "KPI Configuration", icon: Target },
    { key: "audit", label: "Audit Trail", icon: ScrollText },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];
  if (role === "ADMIN") return adminNav;
  if (role === "SUPERVISOR") return supervisorNav;
  return employeeNav;
}

function SidebarBody({
  user, nav, view, onNavigate, unread, expanded, onToggleExpand, isMobile, onLogout,
}: {
  user: SessionUser;
  nav: NavItem[];
  view: string;
  onNavigate: (v: string) => void;
  unread: number;
  expanded: boolean;
  onToggleExpand?: () => void;
  isMobile?: boolean;
  onLogout: () => void;
}) {
  return (
    <div className={cn("k-glass-chrome flex h-full flex-col border-r border-white/[0.07]", !expanded && "k-rail-collapsed")}>
      {/* Brand row */}
      <div className={cn("flex items-center px-4 py-5", !expanded && "justify-center px-2")}>
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b7ff5] via-[#6c5ce7] to-[#5b4bd4] font-black text-white shadow-[0_8px_24px_-6px_rgba(108,92,231,0.65),inset_0_1px_0_rgba(255,255,255,0.35)]">
          K
          <span className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
        </div>
        <div className={cn("k-rail-label min-w-0", !expanded && "k-collapsed-hide")}>
          <p className="truncate text-sm font-bold leading-none text-white">Kallmania</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-slate-500">SBTS Group</p>
        </div>
        {onToggleExpand && expanded && (
          <button
            onClick={onToggleExpand}
            title="Slide sidebar out"
            className="ml-auto hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200 lg:flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); if (isMobile) onToggleExpand?.(); }}
              title={expanded ? undefined : item.label}
              className={cn(
                "k-nav-item group relative flex w-full items-center rounded-xl py-2.5 text-sm font-medium",
                active ? "k-nav-active" : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-200",
                expanded ? "px-3" : "justify-center px-0",
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-[#c4bbff]" : "text-slate-500 group-hover:text-slate-300")} />
              </span>
              <span className={cn("k-rail-label truncate text-left", !expanded && "k-collapsed-hide")}>{item.label}</span>
              {item.key === "notifications" && unread > 0 && (
                <span className={cn(
                  "rounded-full bg-[#e8833a] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(232,131,58,0.6)]",
                  !expanded && "absolute right-2 top-1.5 px-1",
                )}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-white/[0.07] p-3">
        <div className={cn("flex items-center", !expanded && "justify-center")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#31456b] to-[#22334e] text-xs font-bold text-[#b3a5ff] ring-1 ring-white/15">
            {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div className={cn("k-rail-label min-w-0", !expanded && "k-collapsed-hide")}>
            <p className="truncate text-xs font-semibold text-slate-200">{user.fullName}</p>
            <p className="truncate text-[10px] text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          {expanded && (
            <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out" className="h-8 w-8 shrink-0 text-slate-400 hover:bg-white/10 hover:text-rose-300">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!expanded && (
          <button
            onClick={onToggleExpand}
            title="Slide sidebar in"
            className="mx-auto mt-3 hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200 lg:flex"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
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
  const [expanded, setExpanded] = useState(true);

  // Restore sidebar state
  useEffect(() => {
    const saved = window.localStorage.getItem("kallmania.sidebar");
    if (saved === "collapsed") setExpanded(false);
  }, []);
  const toggleExpand = () => {
    setExpanded((prev) => {
      window.localStorage.setItem("kallmania.sidebar", prev ? "collapsed" : "expanded");
      return !prev;
    });
  };

  const handleNavigate = (v: string) => {
    if (v === "__logout__") { onLogout(); return; }
    onNavigate(v);
    setMobileOpen(false);
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Liquid glass aurora background */}
      <div className="k-aurora" aria-hidden />

      {/* Desktop sidebar — slides in and out */}
      <aside className={cn("k-sidebar-anim sticky top-0 hidden h-screen shrink-0 lg:block", expanded ? "w-64" : "w-[76px]")}>
        <SidebarBody user={user} nav={nav} view={view} onNavigate={handleNavigate} unread={unread} expanded={expanded} onToggleExpand={toggleExpand} onLogout={onLogout} />
      </aside>

      {/* Mobile sidebar — slides in over content */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:bg-white/10 lg:hidden" title="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-0 bg-transparent p-0 [&>button]:text-slate-300">
          <SidebarBody user={user} nav={nav} view={view} onNavigate={handleNavigate} unread={unread} expanded onToggleExpand={() => setMobileOpen(false)} isMobile onLogout={onLogout} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="k-glass-chrome sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[0.07] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Home className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate text-sm font-semibold text-slate-200">{nav.find((n) => n.key === view)?.label || "Kallmania"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-400 hover:bg-white/10 hover:text-slate-100" onClick={() => handleNavigate("notifications")} title="Notifications">
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#e8833a] text-[8px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-2 pr-3 backdrop-blur transition hover:bg-white/10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#31456b] to-[#22334e] text-[10px] font-bold text-[#b3a5ff] ring-1 ring-white/15">
                    {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-200 sm:block">{user.fullName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#16233a]/95 text-slate-200 backdrop-blur-xl">
                <DropdownMenuLabel>
                  <p className="text-xs font-semibold">{user.fullName}</p>
                  <p className="mt-0.5 text-[10px] font-normal text-slate-400">{user.email}</p>
                  <p className="mt-1 text-[10px] font-normal text-[#8b7ff5]">{ROLE_LABELS[user.role]} · {DEPT_LABELS[user.department]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <ChangePasswordItem />
                <DropdownMenuItem onClick={onLogout} className="text-rose-300 focus:text-rose-300">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="mt-auto border-t border-white/[0.06] px-6 py-3 text-center text-[11px] text-slate-600">
          Kallmania · SBTS Group Global
        </footer>
      </div>
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
