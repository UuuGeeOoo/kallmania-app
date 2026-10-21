"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ROLE_LABELS, DEPT_LABELS, TEAM_LABELS, fmtDate, type SessionUser } from "@/lib/client";
import { PageHeader, SectionCard, Field, inputCls, StatusBadge } from "@/components/kallmania/shared";
import { useToast } from "@/hooks/use-toast";
import { Country, State, City } from "country-state-city";
import { Loader2, Save, UserCircle2, KeyRound, Info } from "lucide-react";

const ALL_COUNTRIES = Country.getAllCountries().slice().sort((a, b) => a.name.localeCompare(b.name));

interface ProfileDTO {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  team: string | null;
  employeeId: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

export default function ProfileView({ user }: { user: SessionUser }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", country: "", state: "", city: "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const statesOfCountry = form.country ? State.getStatesOfCountry(form.country) : [];
  const citiesOfState = (() => {
    if (!form.country || !form.state) return [];
    const iso = statesOfCountry.find((s) => s.name === form.state)?.isoCode;
    return iso ? City.getCitiesOfState(form.country, iso).slice(0, 400) : [];
  })();

  useEffect(() => {
    (async () => {
      try {
        const { profile } = await api<{ profile: ProfileDTO }>("/api/profile");
        setProfile(profile);
        setForm({ fullName: profile.fullName, phone: profile.phone || "", country: profile.country || "", state: profile.state || "", city: profile.city || "" });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true); setError(null);
    try {
      const { profile: updated, message } = await api<{ profile: ProfileDTO; message: string }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone, country: form.country, state: form.state, city: form.city }),
      });
      setProfile(updated);
      setForm({ fullName: updated.fullName, phone: updated.phone || "", country: updated.country || "", state: updated.state || "", city: updated.city || "" });
      toast({ title: "Profile saved", description: message });
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast({ title: "Could not save profile", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pw.newPassword !== pw.confirm) {
      toast({ title: "Passwords do not match", description: "Re-enter the new password confirmation.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast({ title: "Password changed", description: "Use your new password at the next sign-in." });
    } catch (e) {
      const msg = (e as Error).message;
      toast({ title: "Could not change password", description: msg, variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  const dirty =
    profile &&
    (form.fullName !== profile.fullName || form.phone !== (profile.phone || "") || form.country !== (profile.country || "") || form.state !== (profile.state || "") || form.city !== (profile.city || ""));

  if (loading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!profile) {
    return <div className="py-10 text-center text-sm text-rose-300">{error || "Profile unavailable."}</div>;
  }

  const initials = profile.fullName.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Review your details and make corrections — role, department and email are managed by administrators" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Identity card */}
        <SectionCard title="Account" className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#6c5ce7]/25 text-xl font-bold text-white">
              {initials || <UserCircle2 className="h-8 w-8" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">{profile.fullName}</p>
              <p className="truncate text-xs text-slate-400">{profile.email}</p>
              <div className="mt-1.5"><StatusBadge status={profile.status} /></div>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Role</dt><dd className="text-right text-slate-200">{ROLE_LABELS[profile.role] || profile.role}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Department</dt><dd className="text-right text-slate-200">{DEPT_LABELS[profile.department] || profile.department}</dd></div>
            {profile.team && <div className="flex justify-between gap-2"><dt className="text-slate-500">Team under Kallmania</dt><dd className="text-right text-slate-200">{TEAM_LABELS[profile.team] || profile.team}</dd></div>}
            {profile.employeeId && <div className="flex justify-between gap-2"><dt className="text-slate-500">Employee ID</dt><dd className="text-right text-slate-200">{profile.employeeId}</dd></div>}
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Member since</dt><dd className="text-right text-slate-200">{fmtDate(profile.createdAt)}</dd></div>
          </dl>
          <p className="mt-4 flex items-start gap-1.5 rounded-md border border-white/5 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            To correct your role, department, team, employee ID or email, contact an administrator — these fields drive reports and permissions.
          </p>
        </SectionCard>

        {/* Editable details */}
        <SectionCard title="Personal details" subtitle="Keep your name and contact information up to date" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input className={inputCls} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="Phone number">
              <Input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +234 801 234 5678" />
            </Field>
            <Field label="Country" hint="Used for centre-based task assignment">
              <Select value={form.country || undefined} onValueChange={(v) => setForm({ ...form, country: v, state: "" })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {ALL_COUNTRIES.map((c) => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="State / region" hint={form.country ? undefined : "Pick a country first"}>
              <Select value={form.state || undefined} onValueChange={(v) => setForm({ ...form, state: v, city: "" })} disabled={!form.country}>
                <SelectTrigger className={inputCls}><SelectValue placeholder={form.country ? "Select state / region" : "Pick a country first"} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {statesOfCountry.map((s) => <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City" hint={form.state ? undefined : "Pick a state first (optional)"}>
              <Select value={form.city || undefined} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state}>
                <SelectTrigger className={inputCls}><SelectValue placeholder={form.state ? "Select city (optional)" : "Pick a state first"} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {citiesOfState.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button disabled={saving || !dirty || form.fullName.trim().length < 2} onClick={saveProfile} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </SectionCard>

        {/* Password */}
        <SectionCard title="Change password" subtitle="Confirm your current password, then set the new one" className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Current password" required>
              <Input type="password" autoComplete="current-password" className={inputCls} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="New password" required hint="At least 6 characters">
              <Input type="password" autoComplete="new-password" className={inputCls} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <Field label="Confirm new password" required>
              <Input type="password" autoComplete="new-password" className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">Changing your password keeps you signed in on this device.</p>
            <Button disabled={savingPw || !pw.currentPassword || pw.newPassword.length < 6 || !pw.confirm} onClick={savePassword} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
              {savingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Update password
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
