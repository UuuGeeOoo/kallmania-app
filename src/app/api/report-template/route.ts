import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";
import { TEAM_LEAD_TEMPLATE_KEY, TEAM_LEAD_TEMPLATES, defaultTemplateFor, type TlDefinition } from "@/lib/team-lead-template";

export const TEMPLATE_KEYS: string[] = TEAM_LEAD_TEMPLATES.map((t) => t.key);

function templateMeta(key: string) {
  return TEAM_LEAD_TEMPLATES.find((t) => t.key === key);
}
function defaultName(key: string): string {
  const meta = templateMeta(key);
  return meta ? `${meta.label} — Team Lead Daily Report Template` : "Report Template";
}
function defaultDescription(key: string): string {
  const meta = templateMeta(key);
  return meta
    ? `${meta.description} Used by: ${meta.audience}. Editable by administrators and supervisors.`
    : "";
}

/** GET /api/report-template?key=TEAM_LEAD — any approved user may read (form rendering). Falls back to the shipped default. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || TEAM_LEAD_TEMPLATE_KEY;
    if (!TEMPLATE_KEYS.includes(key)) return fail("Unknown template key", 404);
    const row = await db.reportTemplate.findUnique({ where: { key } });
    if (!row) {
      const def = defaultTemplateFor(key);
      return ok({
        template: { key, name: defaultName(key), description: defaultDescription(key), definition: def },
        isCustom: false,
      });
    }
    let definition: TlDefinition;
    try {
      definition = JSON.parse(row.definition) as TlDefinition;
    } catch {
      definition = defaultTemplateFor(key);
    }
    return ok({
      template: { key: row.key, name: row.name, description: row.description, definition },
      isCustom: true,
      updatedBy: row.updatedById ? { id: row.updatedById } : null,
      updatedAt: row.updatedAt,
    });
  });
}

/** PUT /api/report-template — administrators & supervisors customize the format. */
export async function PUT(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Only administrators and supervisors can edit the report template", 403);
    const body = await req.json();
    const key = String(body.key || TEAM_LEAD_TEMPLATE_KEY);
    if (!TEMPLATE_KEYS.includes(key)) return fail("Unknown template key");
    const { name, description, definition } = body;
    if (!definition || !Array.isArray(definition.sections) || definition.sections.length === 0)
      return fail("Template definition must contain at least one section");
    if (!definition.title || typeof definition.title !== "string") return fail("Template title is required");
    for (const s of definition.sections) {
      if (!s.id || !s.title || !s.type) return fail("Every section needs an id, title and type");
      if (!["fields", "metrics", "table", "textarea"].includes(s.type)) return fail(`Invalid section type: ${s.type}`);
    }
    const saved = await db.reportTemplate.upsert({
      where: { key },
      create: {
        key,
        name: name || defaultName(key),
        description: description ?? defaultDescription(key),
        definition: JSON.stringify(definition),
        updatedById: me.id,
      },
      update: {
        name: name || defaultName(key),
        description: description ?? defaultDescription(key),
        definition: JSON.stringify(definition),
        updatedById: me.id,
      },
    });
    await audit({
      userId: me.id, actorName: me.fullName, action: "UPDATE_REPORT_TEMPLATE", entity: "ReportTemplate", entityId: saved.id,
      details: `${key} template updated — ${definition.sections.length} sections`,
    });
    return ok({ success: true, template: { key: saved.key, name: saved.name, definition } });
  });
}

/** DELETE /api/report-template?key=TEAM_LEAD — reset back to the shipped default. */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Only administrators and supervisors can reset the report template", 403);
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || TEAM_LEAD_TEMPLATE_KEY;
    await db.reportTemplate.deleteMany({ where: { key } });
    await audit({
      userId: me.id, actorName: me.fullName, action: "RESET_REPORT_TEMPLATE", entity: "ReportTemplate", entityId: key,
      details: `${key} template reset to default`,
    });
    return ok({ success: true });
  });
}
