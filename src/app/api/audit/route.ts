import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireSupervisorOrAdmin } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireSupervisorOrAdmin();
    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("take") || "100", 10), 300);
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
    return ok({ logs });
  });
}
