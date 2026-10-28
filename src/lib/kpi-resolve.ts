import { db } from "@/lib/db";

/**
 * Single authoritative read path for the centre-aware KPI catalogue.
 *
 * KpiConfig rows live in two scopes: ("ALL","ALL") is the global default for a
 * department and ("NG","Lagos")-style rows are centre-specific overrides. Every
 * consumer (agent report forms, dashboards, cumulative summaries, submit-time
 * validation) must read through this resolver so a saved centre edit flows
 * everywhere the same way — centre overrides win over globals, centre-only
 * custom metrics are appended, and a user without a centre simply gets the
 * global defaults.
 */

export interface ResolvedKpiConfig {
  id: string;
  department: string;
  key: string;
  label: string;
  category: string;
  unit: string;
  direction: string;
  defaultTarget: number | null;
  derivedFrom: string | null;
  mandatory: boolean;
  active: boolean;
  sortOrder: number;
  centreCountry: string;
  centreState: string;
  // true → this row is the centre's own override (or a centre-only metric)
  isOverride: boolean;
  // the global default target for reference (null when this IS the global row)
  globalTarget: number | null;
}

const GLOBAL_SCOPE = { centreCountry: "ALL", centreState: "ALL" };

type CentreRef = { country: string | null | undefined; state: string | null | undefined };

/** True when the ref carries a concrete centre (both parts set). */
export function hasCentre(c: CentreRef | null | undefined): boolean {
  return !!(c && c.country && c.state);
}

/**
 * Resolve the effective catalogue: global defaults merged with the centre's
 * overrides (centre row replaces the global row for the same department+key;
 * centre-only metrics appear at the end of their department). When no centre
 * is given — or the user has no country/state — the plain global catalogue is
 * returned with isOverride=false.
 */
export async function resolveKpiCatalogue(centre?: CentreRef | null): Promise<ResolvedKpiConfig[]> {
  const globals = await db.kpiConfig.findMany({
    where: GLOBAL_SCOPE,
    orderBy: [{ department: "asc" }, { sortOrder: "asc" }],
  });

  if (!hasCentre(centre)) {
    return globals.map((g) => ({ ...g, isOverride: false, globalTarget: g.defaultTarget }));
  }

  const overrides = await db.kpiConfig.findMany({
    where: { centreCountry: centre!.country!, centreState: centre!.state! },
    orderBy: [{ department: "asc" }, { sortOrder: "asc" }],
  });
  const byKey = new Map(overrides.map((o) => [`${o.department}|${o.key}`, o]));

  const merged: ResolvedKpiConfig[] = globals.map((g) => {
    const o = byKey.get(`${g.department}|${g.key}`);
    return o
      ? { ...o, isOverride: true, globalTarget: g.defaultTarget }
      : { ...g, isOverride: false, globalTarget: g.defaultTarget };
  });
  for (const o of overrides) {
    if (!globals.some((g) => g.department === o.department && g.key === o.key)) {
      merged.push({ ...o, isOverride: true, globalTarget: null });
    }
  }
  return merged;
}

/**
 * key → effective target map built from resolved catalogue rows.
 * `departments` lists the departments in priority order — a key found in an
 * earlier department wins (BPO before INBOUND, etc.). Keys without a
 * configured target map to null.
 */
export function kpiTargetMap(
  rows: { department: string; key: string; defaultTarget: number | null }[],
  departments: string[],
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const dept of departments) {
    for (const r of rows) {
      if (r.department !== dept) continue;
      if (!map.has(r.key)) map.set(r.key, r.defaultTarget);
    }
  }
  return map;
}
