import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import { fail } from "@/lib/api-utils";
import { getMasterBuffer } from "@/lib/report-masters";

/**
 * GET /api/report-templates/master/file?reportType=AGENT_BPO
 *
 * Download the CURRENT master template for a report type (admins & supervisors)
 * — with an attachment disposition so it never opens inline unexpectedly.
 */
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") throw new AuthError("Not authorized", 403);

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("reportType") || "";
    if (!reportType) return fail("reportType is required");

    const master = await getMasterBuffer(reportType);
    if (!master) return fail("No master template exists for this report type", 404);

    const safeName = master.originalName.replace(/[^A-Za-z0-9._ ()-]/g, "_") || "master-template.docx";
    return new Response(new Uint8Array(master.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    console.error("Master file error:", e);
    return fail(e instanceof Error ? e.message : "Could not fetch master template", 500);
  }
}
