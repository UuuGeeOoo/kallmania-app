import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { PUSH_CATEGORIES, effectivePrefs, mandatoryCategories } from "@/lib/push";

/**
 * GET  /api/push/preferences → category catalogue (labels), the
 *      administrator-defined mandatory categories, and the caller's prefs.
 * PATCH /api/push/preferences { pushEnabled?, categories? } → updates own prefs.
 */
export async function GET() {
  return handle(async () => {
    const me = await requireUser();
    const [prefs, mandatory] = await Promise.all([effectivePrefs(me.id), mandatoryCategories()]);
    return ok({ categories: PUSH_CATEGORIES, mandatory, prefs });
  });
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = (await req.json()) as { pushEnabled?: unknown; categories?: unknown };
    const current = await effectivePrefs(me.id);

    let pushEnabled = current.pushEnabled;
    if (typeof body.pushEnabled === "boolean") pushEnabled = body.pushEnabled;

    let categories = current.categories;
    if (body.categories && typeof body.categories === "object" && !Array.isArray(body.categories)) {
      const incoming = body.categories as Record<string, unknown>;
      const clean: Record<string, boolean> = {};
      for (const cat of PUSH_CATEGORIES) {
        if (typeof incoming[cat.type] === "boolean") clean[cat.type] = incoming[cat.type] as boolean;
      }
      categories = clean;
    }

    await db.pushPreference.upsert({
      where: { userId: me.id },
      update: { pushEnabled, categories: JSON.stringify(categories) },
      create: { userId: me.id, pushEnabled, categories: JSON.stringify(categories) },
    });
    return ok({ success: true, prefs: { pushEnabled, categories } });
  });
}
