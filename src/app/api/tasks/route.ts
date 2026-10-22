import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { audit, notify } from "@/lib/notify";

const TASK_INCLUDE = {
  assignee: { select: { id: true, fullName: true, role: true } },
  creator: { select: { id: true, fullName: true } },
  assignees: { include: { user: { select: { id: true, fullName: true, role: true } } } },
} as const;

/** Visibility filter for a non-supervisor user: individual + centre + all-centre tasks. */
function visibilityFor(me: { id: string; country: string | null; state: string | null }) {
  const or: Record<string, unknown>[] = [
    { assigneeId: me.id },
    { allCentres: true },
    { assignees: { some: { userId: me.id } } },
  ];
  // Centre match only when the user has a known location — otherwise a null
  // centreCountry/centreState pair would wrongly match untargeted tasks.
  if (me.country && me.state) {
    or.push({ centreCountry: me.country, centreState: me.state });
  }
  return or;
}

/** Manager centre scope: supervisors & team leads only manage their own centre. */
function centreScopeFor(me: { id: string; role: string; country: string | null; state: string | null }): Record<string, unknown>[] | null {
  if (me.role === "ADMIN") return null; // administrators see every centre
  if (!me.country || !me.state) return null;
  return [
    { createdById: me.id },
    { allCentres: true },
    { centreCountry: me.country, centreState: me.state },
    { assignee: { country: me.country, state: me.state } },
    { assignees: { some: { user: { country: me.country, state: me.state } } } },
  ];
}

/** GET /api/tasks?mine=1&date=YYYY-MM-DD&department=BPO&status=BLOCKED */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const isManager = isSupervisorLike(me) || me.role === "TEAM_LEAD";

    const where: Record<string, unknown> = {};
    if (mine || !isManager) {
      // Regular users see: tasks assigned to them, tasks assigned to their
      // centre, TaskAssignee rows naming them, and org-wide (all-centre) tasks.
      where.OR = visibilityFor(me);
    } else {
      // Supervisors/team leads: only their centre; admins: every centre.
      const centreScope = centreScopeFor(me);
      if (assigneeId) {
        const person = [{ assigneeId }, { assignees: { some: { userId: assigneeId } } }];
        where.AND = centreScope ? [{ OR: centreScope }, { OR: person }] : [{ OR: person }];
      } else if (centreScope) {
        where.OR = centreScope;
      }
    }
    if (department && isManager) where.department = department;
    if (status) where.status = status;

    const tasks = await db.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ deadline: "asc" }, { dateAssigned: "desc" }],
      take: 300,
    });
    return ok({ tasks });
  });
}

/** POST — admins/supervisors/team-leads create tasks (single, multiple agents, whole-centre or all-centre); employees can create personal notes-to-self */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { title, description, assigneeId, assigneeIds, department, category, projectRef, priority, requiredOutcome, target, kpiKey, deadline, estimatedHours, centreCountry, centreState, allCentres } = body;
    if (!title) return fail("Task title is required");

    const isManager = isSupervisorLike(me) || me.role === "TEAM_LEAD";
    const wantsCentreScope = Boolean(allCentres) || Boolean(centreCountry && centreState);
    if (wantsCentreScope && !isSupervisorLike(me)) {
      return fail("Only supervisors and administrators can assign tasks to centres", 403);
    }
    if (centreState && !centreCountry) return fail("Select the country of the centre");
    if (centreCountry && !/^[A-Z]{2}$/.test(String(centreCountry))) return fail("Invalid country code");

    // Unified multi-assignee list (single assigneeId kept for backwards compat)
    const ids: string[] = [...new Set([...(Array.isArray(assigneeIds) ? assigneeIds.filter(Boolean).map(String) : []), ...(assigneeId ? [String(assigneeId)] : [])])];

    // Resolve assignment mode: ALL_CENTRES > INDIVIDUAL(multi) > WHOLE_CENTRE
    const mode = allCentres ? "ALL_CENTRES" : ids.length > 0 ? "INDIVIDUAL" : centreCountry && centreState ? "WHOLE_CENTRE" : "UNASSIGNED";

    let assignee: { id: string; fullName: string; department: string } | null = null;
    const assignees: { id: string; fullName: string; department: string }[] = [];
    if (mode === "INDIVIDUAL") {
      for (const uid of ids) {
        const found = await db.user.findUnique({ where: { id: uid }, select: { id: true, fullName: true, department: true, team: true, country: true, state: true } });
        if (!found) return fail("Assignee not found", 404);
        if (!isManager) {
          if (uid !== me.id) return fail("Employees can only create tasks for themselves", 403);
        } else if (uid !== me.id) {
          // Team leads & supervisors may only assign within their own centre;
          // administrators may assign to anyone in any centre.
          if (me.role !== "ADMIN") {
            const sameCentre = me.country && me.state && found.country === me.country && found.state === me.state;
            if (!sameCentre) return fail(`${found.fullName} is not in your centre (${me.state})`, 403);
            // Team leads can only assign to members of their OWN team within the
            // centre — only supervisors (and admins) reach the whole centre.
            if (me.role === "TEAM_LEAD") {
              if (!me.team) return fail("Your account has no team set — ask an administrator to set your team before assigning tasks", 403);
              if (found.team !== me.team) return fail(`${found.fullName} is not in your team (${me.team}) — team leads can only assign tasks to their own team members`, 403);
            }
          }
        }
        assignees.push(found);
      }
      assignee = assignees[0] || null;
    }

    let centreAgentCount = 0;
    if (mode === "WHOLE_CENTRE") {
      centreAgentCount = await db.user.count({
        where: { country: centreCountry, state: centreState, status: "APPROVED", role: { not: "ADMIN" } },
      });
      if (centreAgentCount === 0) return fail("No approved agents found in that centre");
    }

    const task = await db.task.create({
      data: {
        title: String(title).trim(),
        description: description || null,
        department: department || assignee?.department || me.department,
        assigneeId: mode === "INDIVIDUAL" ? (assignees[0]?.id || null) : null,
        createdById: me.id,
        category: category || null,
        projectRef: projectRef || null,
        priority: priority || "MEDIUM",
        requiredOutcome: requiredOutcome || null,
        target: target !== undefined && target !== null && target !== "" ? String(target) : null,
        kpiKey: kpiKey || null,
        deadline: toDateOrNull(deadline),
        estimatedHours: estimatedHours ? parseFloat(String(estimatedHours)) : null,
        // Centre fields are a BROADCAST scope, not metadata: an individual
        // assignment (admin picked one person from a centre context) must stay
        // visible to that person only.
        centreCountry: mode === "WHOLE_CENTRE" ? centreCountry : null,
        centreState: mode === "WHOLE_CENTRE" ? centreState : null,
        allCentres: Boolean(allCentres),
      },
      include: TASK_INCLUDE,
    });

    // Individual (single or multi-agent) assignment: snapshot every chosen
    // person into TaskAssignee rows (per-person status tracking) and notify.
    if (mode === "INDIVIDUAL" && assignees.length > 0) {
      await db.taskAssignee.createMany({
        data: assignees.map((u) => ({ taskId: task.id, userId: u.id })),
        skipDuplicates: true,
      });
      const due = task.deadline ? ` — due ${new Date(task.deadline).toISOString().slice(0, 10)}` : "";
      for (const person of assignees) {
        if (person.id === me.id) continue;
        await notify({
          userId: person.id,
          type: "TASK_ASSIGNED",
          severity: "INFO",
          title: assignees.length > 1 ? "New task assigned to you" : "New task assigned",
          message: `${me.fullName} assigned you: "${task.title}"${due}.`,
          linkData: { view: "tasks", id: task.id },
        });
      }
      if (assignees.length > 1) {
        await db.taskAssignee.updateMany({ where: { taskId: task.id, userId: me.id }, data: { status: "COMPLETED" } });
      }
    }

    // Whole-centre assignment: snapshot every current agent of that centre into
    // TaskAssignee rows (per-person status tracking) and notify each of them.
    if (mode === "WHOLE_CENTRE") {
      const centreAgents = await db.user.findMany({
        where: { country: centreCountry, state: centreState, status: "APPROVED", role: { not: "ADMIN" } },
        select: { id: true, fullName: true },
      });
      if (centreAgents.length > 0) {
        await db.taskAssignee.createMany({
          data: centreAgents.map((u) => ({ taskId: task.id, userId: u.id })),
          skipDuplicates: true,
        });
        const due = task.deadline ? ` — due ${new Date(task.deadline).toISOString().slice(0, 10)}` : "";
        for (const agent of centreAgents) {
          if (agent.id === me.id) continue;
          await notify({
            userId: agent.id,
            type: "TASK_ASSIGNED",
            severity: "INFO",
            title: "New task for your centre",
            message: `${me.fullName} assigned a task to your centre (${centreState}): "${task.title}"${due}.`,
            linkData: { view: "tasks", id: task.id },
          });
        }
        await db.taskAssignee.updateMany({ where: { taskId: task.id, userId: me.id }, data: { status: "COMPLETED" } });
      }
    }

    // All-centres assignment: org-wide broadcast — notify every approved user.
    if (mode === "ALL_CENTRES") {
      const everyone = await db.user.findMany({
        where: { status: "APPROVED", id: { not: me.id } },
        select: { id: true },
        take: 500,
      });
      const due = task.deadline ? ` — due ${new Date(task.deadline).toISOString().slice(0, 10)}` : "";
      for (const person of everyone) {
        await notify({
          userId: person.id,
          type: "TASK_ASSIGNED",
          severity: "INFO",
          title: "New org-wide task",
          message: `${me.fullName} assigned a task to all centres: "${task.title}"${due}.`,
          linkData: { view: "tasks", id: task.id },
        });
      }
    }

    if (task.assigneeId && task.assigneeId !== me.id) {
      await notify({
        userId: task.assigneeId,
        type: "TASK_ASSIGNED",
        severity: "INFO",
        title: "New task assigned",
        message: `${me.fullName} assigned you: "${task.title}"${task.deadline ? ` — due ${new Date(task.deadline).toISOString().slice(0, 10)}` : ""}.`,
        linkData: { view: "tasks", id: task.id },
      });
    }

    const scopeDetail =
      mode === "ALL_CENTRES" ? "assigned to ALL centres (org-wide)"
      : mode === "WHOLE_CENTRE" ? `assigned to ${centreState} centre (${centreAgentCount} agent(s))`
      : mode === "INDIVIDUAL" ? (assignees.length > 1 ? `assigned to ${assignees.length} agents: ${assignees.map((a) => a.fullName).join(", ")}` : `assigned to ${assignee?.fullName}`)
      : "created unassigned";
    await audit({ userId: me.id, actorName: me.fullName, action: "CREATE_TASK", entity: "Task", entityId: task.id, details: `${task.title} — ${scopeDetail}` });
    return ok({ task }, 201);
  });
}

/** PATCH — status updates, progress fields; supervisors can reassign/edit/rescope */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return fail("Task id is required");
    const task = await db.task.findUnique({ where: { id }, include: { assignees: { select: { userId: true } } } });
    if (!task) return fail("Task not found", 404);
    const isOwner =
      task.assigneeId === me.id ||
      task.assignees.some((a) => a.userId === me.id) ||
      task.allCentres ||
      Boolean(me.country && me.state && task.centreCountry === me.country && task.centreState === me.state);
    const isManager = isSupervisorLike(me);
    if (!isOwner && !isManager) return fail("Not authorized to update this task", 403);

    const data: Record<string, unknown> = {};
    const allowed = ["status", "actualHours", "blocker", "nextSteps", "title", "description", "priority", "category", "projectRef", "requiredOutcome", "target", "assigneeId", "deadline", "estimatedHours", "kpiKey", "centreCountry", "centreState", "allCentres"];
    for (const k of allowed) {
      if (k in updates) {
        if (!isManager && ["assigneeId", "centreCountry", "centreState", "allCentres"].includes(k)) continue;
        if (k === "deadline") data[k] = toDateOrNull(updates[k]);
        else if (k === "actualHours" || k === "estimatedHours") data[k] = updates[k] === "" || updates[k] === null ? null : parseFloat(String(updates[k]));
        else if (k === "allCentres") data[k] = Boolean(updates[k]);
        else data[k] = updates[k] === "" ? null : updates[k];
      }
    }
    const updated = await db.task.update({ where: { id }, data, include: TASK_INCLUDE });

    // Notifications
    if (updates.status === "BLOCKED" && task.assigneeId) {
      await notify({
        userId: task.assigneeId,
        type: "TASK_BLOCKED",
        severity: "WARNING",
        title: "Task blocked",
        message: `Task "${updated.title}" was marked BLOCKED by ${me.fullName}${updates.blocker ? `: ${updates.blocker}` : "."}`,
        linkData: { view: "tasks", id },
      });
      const { notifySupervisors } = await import("@/lib/notify");
      await notifySupervisors({
        type: "TASK_BLOCKED",
        severity: "WARNING",
        title: "Technical task blocked",
        message: `${me.fullName} flagged task "${updated.title}" as blocked${updates.blocker ? `: ${updates.blocker}` : "."}`,
        linkData: { view: "tasks", id },
        dedupeKey: `task-blocked:${id}:${new Date().toISOString().slice(0, 13)}`, // hourly dedupe
      }, { includeAdmins: true });
    }
    if (isManager && updates.status && task.assigneeId && task.assigneeId !== me.id) {
      await notify({
        userId: task.assigneeId,
        type: "TASK_UPDATED",
        severity: "INFO",
        title: "Task updated",
        message: `Your task "${updated.title}" status is now: ${String(updates.status).replace(/_/g, " ")}.`,
        linkData: { view: "tasks", id },
      });
    }
    if (updates.status === "COMPLETED") {
      const supervisors = await db.user.findMany({ where: { role: { in: ["SUPERVISOR", "ADMIN"] }, status: "APPROVED" } });
      for (const s of supervisors) {
        await notify({
          userId: s.id,
          type: "TASK_COMPLETED",
          title: "Task completed",
          severity: "INFO",
          message: `${me.fullName} completed task "${updated.title}".`,
          linkData: { view: "tasks", id },
          dedupeKey: `task-done:${id}`,
        });
      }
    }
    await audit({ userId: me.id, actorName: me.fullName, action: "UPDATE_TASK", entity: "Task", entityId: id, details: JSON.stringify(updates).slice(0, 300) });
    return ok({ task: updated });
  });
}

/** DELETE — supervisors only (purges centre-assignment rows first) */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    await db.taskAssignee.deleteMany({ where: { taskId: id } });
    await db.task.delete({ where: { id } });
    await audit({ userId: me.id, actorName: me.fullName, action: "DELETE_TASK", entity: "Task", entityId: id });
    return ok({ success: true });
  });
}
