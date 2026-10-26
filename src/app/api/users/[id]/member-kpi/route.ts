import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit, notify } from "@/lib/notify";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";

/**
 * Individual (per-member) KPI configuration.
 *
 * GET    /api/users/[id]/member-kpi          — list the member's overrides
 * POST   /api/users/[id]/member-kpi          — upsert one override
 * PATCH  /api/users/[id]/member-kpi          — approve / reject a PENDING override
 * DELETE /api/users/[id]/member-kpi?configId= — remove an override
 *
 * Access to a member's configuration:
 *  - ADMIN: any member
 *  - SUPERVISOR: members of their centre
 *  - TEAM_LEAD: agents of their OWN team in their centre
 * Approval rules:
 *  - Administrator / supervisor saves → APPROVED immediately.
 *  - Team lead saves → PENDING until a supervisor or administrator approves.
 */

function catalog() {
  // BPO and inbound agents fill the same KPI table (inbound only makes rows optional)
  const bpoDefs = AGENT_KPI_DEFS.map((d) => ({ key: d.key, label: d.label, category: d.category, unit: d.unit }));
  return {
    BPO: bpoDefs,
    INBOUND: bpoDefs,
    WEB_DEV: TECH_SUMMARY_METRICS,
    SOCIAL_MEDIA: SOCIAL_SUMMARY_METRICS,
  };
}

/** Load the target member and verify the caller may configure their KPI. */
async function authorizeEditor(me: { id: string; role: string; team: string | null; country: string | null; state: string | null }, memberId: string) {
  const member = await db.user.findUnique({
    where: { id: memberId },
    select: { id: true, fullName: true, role: true, team: true, country: true, state: true },
  });
  if (!member) throw new AuthError("Member not found", 404);
  if (me.role === "ADMIN") return member;
  if (me.role === "SUPERVISOR") {
    const sameCentre = me.country && me.state && member.country === me.country && member.state === me.state;
    if (!sameCentre) throw new AuthError("You can only configure the KPI of members in your centre", 403);
    return member;
  }
  if (me.role === "TEAM_LEAD") {
    const sameCentre = me.country && me.state && member.country === me.country && member.state === me.state;
    const sameTeam = me.team && member.team === me.team;
    if (!sameCentre || !sameTeam) throw new AuthError("You can only configure the KPI of members of your own team", 403);
    return member;
  }
  throw new AuthError("Not authorized to configure member KPI", 403);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const isSelf = me.id === id;
    if (!isSelf) await authorizeEditor(me, id);

    const configs = await db.memberKpiConfig.findMany({
      where: { userId: id },
      orderBy: [{ department: "asc" }, { label: "asc" }],
    });
    const canApprove = me.role === "ADMIN" || me.role === "SUPERVISOR";
    const canEdit = isSelf ? false : me.role === "ADMIN" || me.role === "SUPERVISOR" || me.role === "TEAM_LEAD";
    return ok({ configs, catalog: catalog(), canApprove, canEdit });
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const member = await authorizeEditor(me, id);

    const body = await req.json();
    const { department, key, label, target, unit } = body;
    if (!department || !key || !label) return fail("department, key and label are required");
    if (!["BPO", "INBOUND", "WEB_DEV", "SOCIAL_MEDIA"].includes(department)) return fail("Invalid department");
    const parsedTarget =
      target === null || target === undefined || target === "" ? null : parseFloat(String(target));
    if (parsedTarget !== null && Number.isNaN(parsedTarget)) return fail("Target must be a number");

    // Team lead proposals need supervisor/admin approval; supervisor & admin apply directly.
    const status = me.role === "TEAM_LEAD" ? "PENDING" : "APPROVED";
    const values = {
      label: String(label).trim(),
      target: parsedTarget,
      unit: unit || "count",
      status,
      proposedById: me.id,
      proposedByName: me.fullName,
      reviewedById: status === "APPROVED" ? me.id : null,
      reviewedByName: status === "APPROVED" ? me.fullName : null,
    };

    const config = await db.memberKpiConfig.upsert({
      where: { userId_department_key: { userId: id, department, key } },
      create: { userId: id, department, key, ...values },
      update: values,
    });

    if (status === "PENDING") {
      // Ask every supervisor and administrator to approve the team lead's proposal.
      const approvers = await db.user.findMany({
        where: { status: "APPROVED", role: { in: ["SUPERVISOR", "ADMIN"] } },
        select: { id: true },
      });
      for (const a of approvers) {
        await notify({
          userId: a.id,
          type: "MEMBER_KPI_APPROVAL",
          severity: "WARNING",
          title: `KPI approval needed — ${member.fullName}`,
          message: `${me.fullName} set ${label}: target ${parsedTarget ?? "none"}. Approve or reject it from their individual KPI configuration.`,
          linkData: { view: "kpi-config", userId: id },
          dedupeKey: `memberkpi:${config.id}:${a.id}`,
        });
      }
      await notify({
        userId: id,
        type: "MEMBER_KPI_PROPOSED",
        severity: "INFO",
        title: `Your KPI target was updated (pending approval)`,
        message: `${me.fullName} proposed ${label}: ${parsedTarget ?? "no target"}. It applies once a supervisor or administrator approves it.`,
        linkData: { view: "profile" },
      });
    } else {
      await notify({
        userId: id,
        type: "MEMBER_KPI_UPDATED",
        severity: "INFO",
        title: `Your individual KPI configuration was updated`,
        message: `${me.fullName} set ${label}: target ${parsedTarget ?? "none"}.`,
        linkData: { view: "profile" },
      });
    }

    await audit({
      userId: me.id, actorName: me.fullName, action: "UPSERT_MEMBER_KPI", entity: "MemberKpiConfig", entityId: config.id,
      details: `${member.fullName} — ${department}/${key} target=${parsedTarget ?? "none"} [${status}]`,
    });
    return ok({ config }, 201);
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") throw new AuthError("Only supervisors and administrators can review member KPI changes", 403);
    const { id } = await ctx.params;
    const member = await authorizeEditor(me, id);

    const body = await req.json();
    const { configId, action, note } = body;
    if (!configId || !["approve", "reject"].includes(action)) return fail("configId and action (approve|reject) are required");
    const config = await db.memberKpiConfig.findUnique({ where: { id: configId } });
    if (!config || config.userId !== id) return fail("KPI configuration not found", 404);
    if (config.status !== "PENDING") return fail("Only pending proposals can be reviewed");

    const updated = await db.memberKpiConfig.update({
      where: { id: configId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedById: me.id,
        reviewedByName: me.fullName,
        reviewNote: note ? String(note).slice(0, 300) : null,
      },
    });

    await notify({
      userId: id,
      type: action === "approve" ? "MEMBER_KPI_APPROVED" : "MEMBER_KPI_REJECTED",
      severity: "INFO",
      title: action === "approve" ? `KPI target approved: ${config.label}` : `KPI proposal rejected: ${config.label}`,
      message: `${me.fullName} ${action === "approve" ? "approved" : "rejected"} the proposal by ${config.proposedByName || "your team lead"}${note ? ` — ${note}` : "."}`,
      linkData: { view: "profile" },
    });
    if (config.proposedById && config.proposedById !== id) {
      await notify({
        userId: config.proposedById,
        type: action === "approve" ? "MEMBER_KPI_APPROVED" : "MEMBER_KPI_REJECTED",
        severity: "INFO",
        title: `${me.fullName} ${action}d your KPI proposal for ${member.fullName}`,
        message: `${config.label}: target ${config.target ?? "none"}${note ? ` — ${note}` : "."}`,
        linkData: { view: "kpi-config", userId: id },
      });
    }
    await audit({
      userId: me.id, actorName: me.fullName, action: action === "approve" ? "APPROVE_MEMBER_KPI" : "REJECT_MEMBER_KPI",
      entity: "MemberKpiConfig", entityId: configId, details: `${member.fullName} — ${config.department}/${config.key}`,
    });
    return ok({ config: updated });
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await ctx.params;
    await authorizeEditor(me, id);
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId");
    if (!configId) return fail("configId is required");
    const config = await db.memberKpiConfig.findUnique({ where: { id: configId } });
    if (!config || config.userId !== id) return fail("KPI configuration not found", 404);
    // Team leads may withdraw only their own pending proposals — approved
    // settings require a supervisor or administrator to remove.
    if (me.role === "TEAM_LEAD" && !(config.status === "PENDING" && config.proposedById === me.id)) {
      throw new AuthError("Team leads can only withdraw their own pending proposals — ask a supervisor or administrator to remove approved settings", 403);
    }
    await db.memberKpiConfig.delete({ where: { id: configId } });
    await audit({
      userId: me.id, actorName: me.fullName, action: "DELETE_MEMBER_KPI", entity: "MemberKpiConfig", entityId: configId,
      details: `${config.department}/${config.key} removed`,
    });
    return ok({ success: true });
  });
}
