"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api, ROLE_LABELS, DEPT_LABELS, type NotificationDTO, type SessionUser } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Upload, ListTodo, ClipboardCheck, Layers, Users, Settings2,
  Bell, LogOut, Menu, ScrollText, Inbox, KeyRound, Home,
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
    { key: "daily-report", label: "Daily Report", icon: FileText },
    { key: "upload", label: "Upload Report", icon: Upload },
    { key: "tasks", label: "My Tasks", icon: ListTodo },
    { key: "my-reports", label: "My Reports", icon: ClipboardCheck },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];
  const supervisorNav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "review", label: "Review Reports", icon: ClipboardCheck },
    { key: "consolidated", label: "Consolidated Report", icon: Layers },
    { key: "supervisor-report", label: "My Daily Report", icon: FileText },
    { key: "team-tasks", label: "Tasks & Assignments", icon: ListTodo },
    { key: "uploads-admin", label: "Uploaded Files", icon: Upload },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];
  const adminNav: NavItem[] = [
    ...supervisorNav.filter((n) => n.key !== "notifications"),
    { key: "admin-users", label: "User Management", icon: Users },
    { key: "kpi-config", label: "KPI Configuration", icon: Settings2 },
    { key: "audit", label: "Audit Trail", icon: ScrollText },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];
  if (role === "ADMIN") return adminNav;
  if (role === "SUPERVISOR") return supervisorNav;
  return employeeNav;
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
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#101b29]">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6c5ce7] font-black text-white">K</div>
        <div>
          <p className="text-sm font-bold leading-none text-white">Kallmania</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">SBTS Group</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); setOpen(false); }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-[#6c5ce7]/15 text-[#b3a5ff] shadow-[inset_0_0_0_1px_rgba(108,92,231,0.35)]" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#a99df8]" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === "notifications" && unread > 0 && (
                <span className="rounded-full bg-[#e8833a] px-1.5 py-0.5 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#263850] text-xs font-bold text-[#b3a5ff]">
            {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">{user.fullName}</p>
            <p className="truncate text-[10px] text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out" className="h-8 w-8 text-slate-400 hover:text-rose-300">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#15202e]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed left-3 top-3 z-40 lg:hidden" title="Menu">
            <Menu className="h-5 w-5 text-slate-300" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-0 bg-transparent p-0 [&>button]:text-slate-300">{sidebar}</SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-[#15202e]/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 pl-10 lg:pl-0">
            <Home className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-200">{nav.find((n) => n.key === view)?.label || "Kallmania"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-400 hover:text-slate-100" onClick={() => onNavigate("notifications")} title="Notifications">
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e8833a]" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 items-center gap-2 rounded-full bg-white/5 px-2 pr-3 hover:bg-white/10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#263850] text-[10px] font-bold text-[#b3a5ff]">
                    {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-200 sm:block">{user.fullName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#1b2a3b] text-slate-200">
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
        <footer className="mt-auto border-t border-white/5 px-6 py-3 text-center text-[11px] text-slate-600">
          Kallmania · SBTS Group Global — ICBM BPO Division
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setOpen(false); setMsg(null); setErr(null); setForm({ currentPassword: "", newPassword: "" }); }}>
          <div className="k-card w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-white">Change password</p>
            <Input type="password" placeholder="Current password" className="border-slate-600/50 bg-[#15202e]/60 text-slate-100" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
            <Input type="password" placeholder="New password (min 6)" className="border-slate-600/50 bg-[#15202e]/60 text-slate-100" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            {err && <p className="text-xs text-rose-400">{err}</p>}
            {msg && <p className="text-xs text-emerald-400">{msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setMsg(null); setErr(null); setForm({ currentPassword: "", newPassword: "" }); }}>Cancel</Button>
              <Button size="sm" className="bg-[#6c5ce7] hover:bg-[#5b4bd4]" onClick={async () => {
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
