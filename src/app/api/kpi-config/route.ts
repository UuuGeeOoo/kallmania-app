import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";

export async function GET() {
  return handle(async () => {
    await requireUser();
    const configs = await db.kpiConfig.findMany({ orderBy: [{ department: "asc" }, { sortOrder: "asc" }] });
    const catalog = {
      BPO: AGENT_KPI_DEFS.map((d) => ({ key: d.key, label: d.label, category: d.category, unit: d.unit })),
      WEB_DEV: TECH_SUMMARY_METRICS,
      SOCIAL_MEDIA: SOCIAL_SUMMARY_METRICS,
    };
    return ok({ configs, catalog });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const body = await req.json();
    const { department, key, label, category, unit, defaultTarget, mandatory, active, direction } = body;
    if (!department || !key || !label) return fail("department, key and label are required");
    const config = await db.kpiConfig.upsert({
      where: { department_key: { department, key } },
      create: {
        department, key, label,
        category: category || "EMAIL_EXTENSION",
        unit: unit || "count",
        direction: direction || "HIGHER_BETTER",
        defaultTarget: defaultTarget === null || defaultTarget === undefined || defaultTarget === "" ? null : parseFloat(String(defaultTarget)),
        mandatory: !!mandatory,
        active: active !== false,
        sortOrder: 100,
      },
      update: {
        label, category: category || "EMAIL_EXTENSION", unit: unit || "count",
        defaultTarget: defaultTarget === null || defaultTarget === undefined || defaultTarget === "" ? null : parseFloat(String(defaultTarget)),
        mandatory: !!mandatory,
        active: active !== false,
        direction: direction || "HIGHER_BETTER",
      },
    });
    return ok({ config }, 201);
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    await db.kpiConfig.delete({ where: { id } });
    return ok({ success: true });
  });
}
