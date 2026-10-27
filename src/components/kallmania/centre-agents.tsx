"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, ROLE_LABELS, TEAM_LABELS, flagEmoji, type UserDTO, type SessionUser } from "@/lib/client";
import { PageHeader, EmptyState, StatusBadge, SectionCard } from "@/components/kallmania/shared";
import { UserKpiDialog } from "@/components/kallmania/admin-views";
import { useCountryIsoMap } from "@/components/kallmania/location-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BarChart3, Loader2, MapPin } from "lucide-react";

/**
 * Centre Staff — supervisors see every agent/staff member in their centre and
 * can open each person's full KPI performance (daily, weekly, monthly, yearly
 * cumulative achievement vs targets plus the complete submission history).
 * The server hard-scopes /api/users to the supervisor's centre.
 */
export default function CentreAgentsView({ user }: { user: SessionUser }) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiUser, setKpiUser] = useState<UserDTO | null>(null);
  const countryIso = useCountryIsoMap();

  useEffect(() => {
    api<{ users: UserDTO[] }>("/api/users")
      .then(({ users }) => setUsers(users))
      .finally(() => setLoading(false));
  }, []);

  const staff = users.filter((u) => u.id !== user.id);
  const agents = staff.filter((u) => u.role === "AGENT_BPO");
  const others = staff.filter((u) => u.role !== "AGENT_BPO");

  return (
    <div>
      <PageHeader
        title="Centre Staff"
        subtitle="Everyone in your centre — click a name to see their full KPI performance (daily, weekly, monthly and yearly)"
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-[#8b7ff5]/30 bg-[#6c5ce7]/10 px-3 py-1.5 text-xs font-semibold text-[#b3a5ff]">
            <MapPin className="h-3.5 w-3.5" />
            {user.country ? `${user.state ? `${user.state}, ` : ""}${user.country}` : "All centres (no centre assigned)"}
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : staff.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No staff in your centre yet" hint="When the administrator assigns agents to your centre they appear here." />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Staff in centre" value={staff.length} />
            <Stat label="Call centre agents" value={agents.length} />
            <Stat label="Team leads & others" value={others.length} />
            <Stat label="Active" value={staff.filter((u) => u.status === "APPROVED").length} />
          </div>

          <SectionCard title="Call centre agents" subtitle="Click a name or the chart icon to open their KPI performance">
            {agents.length === 0 ? (
              <EmptyState title="No agents in your centre yet" />
            ) : (
              <StaffTable rows={agents} onOpen={setKpiUser} countryIso={countryIso} />
            )}
          </SectionCard>

          {others.length > 0 && (
            <SectionCard title="Other staff in centre" subtitle="Team leads and other roles sharing this centre">
              <StaffTable rows={others} onOpen={setKpiUser} countryIso={countryIso} />
            </SectionCard>
          )}
        </div>
      )}

      <UserKpiDialog user={kpiUser} onClose={() => setKpiUser(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="k-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-100">{value}</p>
    </div>
  );
}

function StaffTable({ rows, onOpen, countryIso }: { rows: UserDTO[]; onOpen: (u: UserDTO) => void; countryIso: Record<string, string> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-white/[0.03]">
            <TableHead className="text-[11px] text-slate-400">Name</TableHead>
            <TableHead className="text-[11px] text-slate-400">Role</TableHead>
            <TableHead className="text-[11px] text-slate-400">Team</TableHead>
            <TableHead className="text-[11px] text-slate-400">Centre</TableHead>
            <TableHead className="text-[11px] text-slate-400">Status</TableHead>
            <TableHead className="text-right text-[11px] text-slate-400">KPI performance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u) => (
            <TableRow key={u.id} className="border-white/5">
              <TableCell className="py-2.5">
                <button
                  type="button"
                  onClick={() => onOpen(u)}
                  title="View this staff member's KPI performance"
                  className="flex items-center gap-2 text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#31456b] to-[#22334e] text-[9px] font-bold text-[#b3a5ff] ring-1 ring-white/15">
                    {u.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <span className="text-xs font-semibold text-slate-200 transition-colors hover:text-[#8b7ff5] hover:underline">{u.fullName}</span>
                </button>
              </TableCell>
              <TableCell className="py-2.5 text-xs text-slate-300">{ROLE_LABELS[u.role] || u.role}</TableCell>
              <TableCell className="py-2.5 text-[11px] text-slate-400">{u.team ? TEAM_LABELS[u.team] || u.team : "—"}</TableCell>
              <TableCell className="py-2.5 text-[11px] text-slate-400">
                {u.country ? <span className="inline-flex items-center gap-1">{flagEmoji(countryIso[u.country] || "")} {u.state ? `${u.state}, ` : ""}{u.country}</span> : "—"}
              </TableCell>
              <TableCell className="py-2.5"><StatusBadge status={u.status} /></TableCell>
              <TableCell className="py-2.5 text-right">
                <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5]" onClick={() => onOpen(u)}>
                  <BarChart3 className="mr-1 h-3.5 w-3.5" /> View KPIs
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
