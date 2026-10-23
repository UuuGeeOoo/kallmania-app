"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, TEAM_LABELS, type SessionUser } from "@/lib/client";
import { Country, State, City } from "country-state-city";
import { Loader2, LogIn, UserPlus, ShieldCheck, AlertCircle, CheckCircle2, Building2, Users2, BadgeCheck, Clock4, CalendarClock } from "lucide-react";

/** Teams under Kallmania — every operational role falls in under the Kallmania division */
const BPO_TEAMS = [
  { value: "OUTBOUND", desc: "Outbound calls & email outreach" },
  { value: "INBOUND", desc: "Inbound call centre — receiving calls" },
  { value: "EMAIL", desc: "Email marketing & campaigns" },
  { value: "SOCIAL", desc: "Social media & campaign team" },
  { value: "TECH", desc: "Web development & technical" },
];

/** 250 countries, alphabetical — ISO-2 codes as values */
const ALL_COUNTRIES = Country.getAllCountries().slice().sort((a, b) => a.name.localeCompare(b.name));

const POSITIONS = [
  { value: "AGENT", label: "Agent", desc: "Day-to-day team member" },
  { value: "TEAM_LEAD", label: "Team Lead", desc: "Leads the team & submits the team lead report" },
  { value: "SUPERVISOR", label: "Supervisor", desc: "Supervises teams across the division" },
];

/** Decorative 3D-cube art panel built from the brand reference (CSS shapes, no external asset needed) */
function BrandArt() {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "linear-gradient(160deg,#233248 0%,#101b29 60%,#0c1622 100%)" }}>
      {/* warm glow */}
      <div className="absolute -top-10 right-0 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle,#e8833a,transparent 70%)" }} />
      <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle,#6c5ce7,transparent 70%)" }} />
      {/* lime orbs */}
      <div className="k-orb h-14 w-14 bg-[#dce775] shadow-[0_0_40px_rgba(220,231,117,0.5)]" style={{ top: "18%", right: "18%" }} />
      <div className="k-orb h-9 w-9 bg-[#dce775] shadow-[0_0_30px_rgba(220,231,117,0.5)]" style={{ top: "52%", left: "12%" }} />
      {/* floating cubes */}
      <div className="absolute left-[38%] top-[16%] h-24 w-24 rotate-12 rounded-xl opacity-90" style={{ background: "linear-gradient(135deg,#33465f,#1a2637)", boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }} />
      <div className="absolute left-[48%] top-[30%] h-36 w-36 -rotate-6 rounded-2xl" style={{ background: "linear-gradient(145deg,#3d5270 0%,#232f43 55%,#182334 100%)", boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        <div className="absolute -right-3 top-8 h-24 w-16 rotate-[24deg] rounded-lg" style={{ background: "linear-gradient(135deg,#f0913f,#b4531f)", filter: "blur(0.5px)", opacity: 0.92 }} />
      </div>
      <div className="absolute bottom-[10%] right-[8%] h-28 w-28 rotate-[18deg] rounded-xl" style={{ background: "linear-gradient(135deg,#2c3c53,#141f2f)", boxShadow: "0 30px 70px rgba(0,0,0,0.55)" }} />
      <div className="absolute bottom-[24%] left-[16%] h-16 w-16 rotate-45 rounded-lg opacity-80" style={{ background: "linear-gradient(135deg,#5b3a1e,#2b1c10)" }} />
      {/* brand caption */}
      <div className="absolute bottom-8 left-8 right-8">
        <p className="text-2xl font-bold text-white">Kallmania</p>
        <p className="mt-1 text-sm text-slate-400">SBTS Group Global</p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Multi-team task management, KPI tracking & intelligent report consolidation.
        </p>
      </div>
    </div>
  );
}

export default function AuthView({ onAuthed }: { onAuthed: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", team: "OUTBOUND", position: "AGENT", employeeId: "", phone: "", country: "NG", state: "", city: "", employmentType: "FULL_TIME" });
  const statesOfCountry = form.country ? State.getStatesOfCountry(form.country) : [];
  const citiesOfState = (() => {
    if (!form.country || !form.state) return [];
    const iso = statesOfCountry.find((s) => s.name === form.state)?.isoCode;
    return iso ? City.getCitiesOfState(form.country, iso).slice(0, 400) : [];
  })();

  const submit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", email: form.email, password: form.password }) });
        const { user } = await api<{ user: SessionUser }>("/api/auth");
        onAuthed(user);
      } else {
        const res = await api<{ message: string }>("/api/auth", {
          method: "POST",
          body: JSON.stringify({
            action: "register",
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            team: form.team,
            position: form.position,
            employeeId: form.employeeId,
            phone: form.phone,
            employmentType: form.position === "AGENT" ? form.employmentType : undefined,
            country: form.country || undefined,
            state: form.state || undefined,
            city: form.city || undefined,
          }),
        });
        setSuccess(res.message || "Registration submitted — an administrator will confirm your account.");
        setMode("login");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="k-aurora" aria-hidden />
      {/* Liquid glass frame around the auth panel */}
      <div className="k-card grid w-full max-w-5xl overflow-hidden md:grid-cols-2" style={{ padding: 0 }}>
        {/* Left — form panel */}
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c5ce7] font-black text-white shadow-lg">K</div>
            <div>
              <p className="text-lg font-bold leading-none text-white">Kallmania</p>
              <p className="mt-0.5 text-xs text-slate-400">SBTS Group Global</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white">{mode === "login" ? "Login" : "Create your account"}</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {mode === "login" ? "See your growth and get consulting support!" : "Choose where you fall in under Kallmania — an administrator will confirm your login and position."}
          </p>

          <div className="mt-7 space-y-4">
            {mode === "register" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Full Name *</Label>
                  <Input className="border-slate-600/50 bg-transparent text-slate-100 placeholder:text-slate-500" placeholder="e.g. Jane Okoro" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                {/* Step 1 — Division (BPO is the major marker all roles fall into) */}
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Division *</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-[#8b7ff5]/40 bg-[#6c5ce7]/10 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6c5ce7] text-white shadow-[0_4px_14px_-2px_rgba(108,92,231,0.7)]"><Building2 className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Kallmania</p>
                      <p className="text-[11px] text-slate-400">All teams and roles fall in under Kallmania — SBTS Group Global</p>
                    </div>
                    <BadgeCheck className="ml-auto h-4 w-4 shrink-0 text-[#dce775]" />
                  </div>
                </div>
                {/* Step 2 — Team */}
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Team * <span className="text-xs font-normal text-slate-500">— choose your team under Kallmania</span></Label>
                  <Select value={form.team} onValueChange={(v) => setForm({ ...form, team: v })}>
                    <SelectTrigger className="border-slate-600/50 bg-transparent text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BPO_TEAMS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{TEAM_LABELS[t.value]} — {t.desc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Step 3 — Position within the team */}
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Position * <span className="text-xs font-normal text-slate-500">— who are you in “{TEAM_LABELS[form.team]}”?</span></Label>
                  <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                    <SelectTrigger className="border-slate-600/50 bg-transparent text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className="flex items-center gap-2"><Users2 className="h-3.5 w-3.5" /> {p.label} — {p.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-[#dce775]" /> Positions are confirmed (and can be changed) by the administrator. Supervisor accounts oversee the whole division.</p>
                </div>
                {/* Step 3b — Employment type (agents choose Full-time or Part-time) */}
                {form.position === "AGENT" && (
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Employment type * <span className="text-xs font-normal text-slate-500">— how will you work?</span></Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "FULL_TIME", label: "Full-time", desc: "Standard 8-hour shift", icon: Clock4 },
                        { value: "PART_TIME", label: "Part-time", desc: "Fewer hours and/or days", icon: CalendarClock },
                      ].map((opt) => {
                        const selected = form.employmentType === opt.value;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, employmentType: opt.value })}
                            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-[#8b7ff5] bg-[#6c5ce7]/15 shadow-[0_0_0_1px_rgba(139,127,245,0.35)]" : "border-slate-600/50 bg-white/[0.02] hover:border-slate-500"}`}
                          >
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-[#b3a5ff]" : "text-slate-500"}`} />
                            <span className="min-w-0">
                              <span className={`block text-sm font-semibold ${selected ? "text-white" : "text-slate-300"}`}>{opt.label}</span>
                              <span className="block text-[11px] leading-snug text-slate-500">{opt.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {form.employmentType === "PART_TIME" && (
                      <p className="text-[11px] leading-relaxed text-amber-300/80">Part-time schedules vary — some work every day for a few hours, others a few days. The administrator will set your exact working days and shift hours (weekends included if needed).</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Country</Label>
                    <Select value={form.country || undefined} onValueChange={(v) => setForm({ ...form, country: v, state: "", city: "" })}>
                      <SelectTrigger className="border-slate-600/50 bg-transparent text-slate-100"><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {ALL_COUNTRIES.map((c) => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">State / Region</Label>
                    <Select value={form.state || undefined} onValueChange={(v) => setForm({ ...form, state: v, city: "" })} disabled={!form.country}>
                      <SelectTrigger className="border-slate-600/50 bg-transparent text-slate-100"><SelectValue placeholder={form.country ? "Select state" : "Pick a country first"} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {statesOfCountry.map((s) => <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">City <span className="text-[10px] font-normal text-slate-500">(optional)</span></Label>
                    <Select value={form.city || undefined} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state || citiesOfState.length === 0}>
                      <SelectTrigger className="border-slate-600/50 bg-transparent text-slate-100"><SelectValue placeholder={form.state ? (citiesOfState.length ? "Select city" : "Type your city") : "Pick a state first"} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {citiesOfState.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Employee ID</Label>
                    <Input className="border-slate-600/50 bg-transparent text-slate-100 placeholder:text-slate-500" placeholder="SBTS-000" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Phone</Label>
                    <Input className="border-slate-600/50 bg-transparent text-slate-100 placeholder:text-slate-500" placeholder="optional" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Email *</Label>
              <Input type="email" className="border-slate-600/50 bg-transparent text-slate-100 placeholder:text-slate-500" placeholder="mail@website.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Password *</Label>
              <Input type="password" className="border-slate-600/50 bg-transparent text-slate-100 placeholder:text-slate-500" placeholder={mode === "register" ? "Min. 6 characters" : "Min. 8 character"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
              </div>
            )}

            <Button onClick={submit} disabled={loading} className="k-btn-primary h-11 w-full rounded-full text-sm font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {mode === "login" ? "Login" : "Register"}
            </Button>

            <p className="text-center text-xs text-slate-400">
              {mode === "login" ? (
                <>Don&apos;t have an account?{" "}
                  <button className="font-semibold text-[#8b7ff5] hover:underline" onClick={() => { setMode("register"); setError(null); setSuccess(null); }}>Register</button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button className="font-semibold text-[#8b7ff5] hover:underline" onClick={() => { setMode("login"); setError(null); setSuccess(null); }}>Login</button>
                </>
              )}
            </p>
          </div>

          <p className="mt-10 text-[11px] text-slate-500">©2026 Kallmania · SBTS Group. All rights reserved</p>
        </div>

        {/* Right — brand art (reference image) */}
        <div className="hidden md:block">
          <BrandArt />
        </div>
      </div>
    </div>
  );
}
