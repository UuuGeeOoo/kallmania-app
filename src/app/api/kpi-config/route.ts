import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";

const GLOBAL_SCOPE = { centreCountry: "ALL", centreState: "ALL" };

type SessionLike = { id: string; role: string; country: string | null; state: string | null; fullName: string };

/** Validate the requested centre scope against the caller's permissions.
 *  Returns { centreCountry, centreState } (both "ALL" for the global scope) or throws:
 *  AuthError for permission problems, plain Error for bad input. */
async function resolveScope(me: SessionLike, body: Record<string, unknown>): Promise<{ centreCountry: string; centreState: string }> {
  const rawCountry = body.centreCountry === undefined || body.centreCountry === null || body.centreCountry === "" ? "ALL" : String(body.centreCountry).trim().toUpperCase();
  const rawState = body.centreState === undefined || body.centreState === null || body.centreState === "" ? "ALL" : String(body.centreState).trim();

  if (rawCountry !== "ALL" && !/^[A-Z]{2}$/.test(rawCountry)) throw new Error("Invalid country code");
  if ((rawCountry === "ALL") !== (rawState === "ALL")) throw new Error("Select both the country and the state of the centre");

  if (me.role === "ADMIN") return { centreCountry: rawCountry, centreState: rawState };

  // Supervisors configure the KPI of their own centre only.
  if (me.role === "SUPERVISOR") {
    if (!me.country || !me.state) throw new AuthError("Your account has no centre location — ask an administrator to set your country and state", 403);
    return { centreCountry: me.country, centreState: me.state };
  }

  throw new AuthError("KPI configuration access required", 403);
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const centreCountry = (searchParams.get("centreCountry") || "ALL").toUpperCase();
    const centreState = searchParams.get("centreState") || "ALL";
    const wantsCentre = centreCountry !== "ALL" && centreState !== "ALL";

    const catalog = {
      BPO: AGENT_KPI_DEFS.map((d) => ({ key: d.key, label: d.label, category: d.category, unit: d.unit })),
      WEB_DEV: TECH_SUMMARY_METRICS,
      SOCIAL_MEDIA: SOCIAL_SUMMARY_METRICS,
    };

    let globals;
    try {
      globals = await db.kpiConfig.findMany({ where: GLOBAL_SCOPE, orderBy: [{ department: "asc" }, { sortOrder: "asc" }] });
    } catch {
      // Centre columns not migrated yet — legacy read: return every row unfiltered.
      const all = await db.kpiConfig.findMany({ orderBy: [{ department: "asc" }, { sortOrder: "asc" }] });
      return ok({ configs: all.map((c) => ({ ...c, isOverride: false, globalTarget: c.defaultTarget })), catalog, centres: [] });
    }

    if (!wantsCentre) {
      // Global catalogue (also used by report forms for default targets).
      return ok({ configs: globals.map((c) => ({ ...c, isOverride: false, globalTarget: c.defaultTarget })), catalog, centres: await listCentres(me) });
    }

    if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") throw new AuthError("KPI configuration access required", 403);
    if (me.role === "SUPERVISOR" && (centreCountry !== me.country || centreState !== me.state)) {
      throw new AuthError("Supervisors can only view the KPI of their own centre", 403);
    }

    const overrides = await db.kpiConfig.findMany({
      where: { centreCountry, centreState },
      orderBy: [{ department: "asc" }, { sortOrder: "asc" }],
    });
    const byKey = new Map(overrides.map((o) => [`${o.department}|${o.key}`, o]));
    const merged = globals.map((g) => {
      const o = byKey.get(`${g.department}|${g.key}`);
      return o
        ? { ...o, isOverride: true, globalTarget: g.defaultTarget }
        : { ...g, isOverride: false, globalTarget: g.defaultTarget };
    });
    // Centre-only custom metrics (no global counterpart) appear at the end.
    for (const o of overrides) {
      if (!globals.some((g) => g.department === o.department && g.key === o.key)) {
        merged.push({ ...o, isOverride: true, globalTarget: null });
      }
    }
    return ok({ configs: merged, catalog, centres: await listCentres(me) });
  });
}

/** Distinct centres (country+state of approved users) — for the administrator's centre selector. */
async function listCentres(me: SessionLike): Promise<{ country: string; state: string; agents: number }[]> {
  if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") return [];
  const where = me.role === "SUPERVISOR" ? { status: "APPROVED", country: me.country, state: me.state } : { status: "APPROVED", country: { not: null }, state: { not: null } };
  const rows = await db.user.groupBy({
    by: ["country", "state"],
    where,
    _count: { _all: true },
  });
  return rows
    .filter((r) => r.country && r.state)
    .map((r) => ({ country: r.country as string, state: r.state as string, agents: r._count._all }))
    .sort((a, b) => a.country.localeCompare(b.country) || a.state.localeCompare(b.state));
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    // KPI configuration is manageable by administrators AND supervisors —
    // supervisors manage the KPI targets for every department of their centre.
    if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") {
      throw new AuthError("KPI configuration access required", 403);
    }
    const body = await req.json();
    const { department, key, label, category, unit, defaultTarget, mandatory, active, direction } = body;
    if (!department || !key || !label) return fail("department, key and label are required");

    let scope: { centreCountry: string; centreState: string };
    try {
      scope = await resolveScope(me, body);
    } catch (e) {
      const msg = (e as Error).message;
      return fail(msg, msg.includes("required") ? 403 : 400);
    }

    // Inbound Call Centre policy: nothing is ever required — every metric stays optional.
    const isInbound = department === "INBOUND";
    const values = {
      label, category: category || "CUSTOM", unit: unit || "count",
      direction: direction || "HIGHER_BETTER",
      defaultTarget: defaultTarget === null || defaultTarget === undefined || defaultTarget === "" ? null : parseFloat(String(defaultTarget)),
      mandatory: isInbound ? false : !!mandatory,
      active: active !== false,
    };
    let config;
    try {
      config = await db.kpiConfig.upsert({
        where: {
          department_key_centreCountry_centreState: {
            department, key, centreCountry: scope.centreCountry, centreState: scope.centreState,
          },
        },
        create: { department, key, ...values, sortOrder: 100, centreCountry: scope.centreCountry, centreState: scope.centreState },
        update: values,
      });
    } catch {
      // Centre columns not migrated yet — legacy upsert without centre scope
      // (findFirst/update/create so it works with any schema shape).
      const existing = await db.kpiConfig.findFirst({ where: { department, key } });
      config = existing
        ? await db.kpiConfig.update({ where: { id: existing.id }, data: values })
        : await db.kpiConfig.create({ data: { ...values, department, key, sortOrder: 100 } });
    }
    const scopeLabel = scope.centreCountry === "ALL" ? "global" : `${scope.centreCountry}/${scope.centreState}`;
    await audit({ userId: me.id, actorName: me.fullName, action: "UPSERT_KPI_CONFIG", entity: "KpiConfig", entityId: config.id, details: `${department}/${key} [${scopeLabel}] target=${config.defaultTarget ?? "none"}` });
    return ok({ config }, 201);
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") {
      throw new AuthError("KPI configuration access required", 403);
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    let row;
    try {
      row = await db.kpiConfig.findUnique({ where: { id } });
    } catch {
      // Centre columns not migrated yet — legacy delete without scope checks.
      await db.kpiConfig.delete({ where: { id } });
      await audit({ userId: me.id, actorName: me.fullName, action: "DELETE_KPI_CONFIG", entity: "KpiConfig", entityId: id });
      return ok({ success: true });
    }
    if (!row) return fail("KPI configuration not found", 404);
    const isGlobal = row.centreCountry === "ALL" && row.centreState === "ALL";
    if (isGlobal && me.role !== "ADMIN") {
      throw new AuthError("Only administrators can delete global default metrics", 403);
    }
    if (!isGlobal && me.role === "SUPERVISOR" && (row.centreCountry !== me.country || row.centreState !== me.state)) {
      throw new AuthError("You can only remove KPI settings for your own centre", 403);
    }
    await db.kpiConfig.delete({ where: { id } });
    await audit({
      userId: me.id, actorName: me.fullName, action: "DELETE_KPI_CONFIG", entity: "KpiConfig", entityId: id,
      details: isGlobal ? `${row.department}/${row.key} [global]` : `${row.department}/${row.key} [${row.centreCountry}/${row.centreState}] reset to default`,
    });
    return ok({ success: true });
  });
}
