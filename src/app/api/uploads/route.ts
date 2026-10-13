import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { audit } from "@/lib/notify";
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const STORAGE_DIR = "/home/z/my-project/uploads-storage";
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** GET /api/uploads?mine=1&status= */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (mine || !isSupervisorLike(me)) where.userId = me.id;
    if (status) where.extractStatus = status;
    const uploads = await db.uploadedFile.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, role: true, department: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok({ uploads });
  });
}

/** POST — multipart upload with dedupe by SHA-256 + user + report date */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const department = (form.get("department") as string) || me.department;
    const reportDate = (form.get("reportDate") as string) || new Date().toISOString().slice(0, 10);
    const campaign = (form.get("campaign") as string) || null;

    if (!file) return fail("No file provided");
    if (file.size === 0) return fail("The file is empty");
    if (file.size > MAX_SIZE) return fail("File exceeds the 15 MB limit");

    const ext = ALLOWED_TYPES[file.type];
    const nameExt = (file.name.split(".").pop() || "").toLowerCase();
    if (!ext && !["docx", "xlsx", "csv", "txt", "pdf", "png", "jpg", "jpeg"].includes(nameExt)) {
      return fail("Unsupported file type. Supported: PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG.");
    }
    const effectiveExt = ext || nameExt;

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");

    // Duplicate detection: same content hash + same user + same reporting date
    const dayStart = new Date(reportDate + "T00:00:00.000Z");
    const dayEnd = new Date(reportDate + "T23:59:59.999Z");
    const duplicate = await db.uploadedFile.findFirst({
      where: { fileHash: hash, userId: me.id, reportDate: { gte: dayStart, lte: dayEnd } },
    });
    if (duplicate) {
      return fail(
        `Possible duplicate: a file with identical content was already uploaded for ${reportDate} ("${duplicate.originalName}", status: ${duplicate.extractStatus}). Uploading the same report twice would double-count metrics.`,
        409
      );
    }

    await mkdir(STORAGE_DIR, { recursive: true });
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${effectiveExt}`;
    await writeFile(path.join(STORAGE_DIR, storedName), buffer);

    const upload = await db.uploadedFile.create({
      data: {
        originalName: file.name,
        storedName,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        fileHash: hash,
        extractStatus: "UPLOADED",
        reportDate: toDateOrNull(reportDate),
        department,
        userId: me.id,
      },
    });
    await audit({ userId: me.id, actorName: me.fullName, action: "UPLOAD_REPORT_FILE", entity: "UploadedFile", entityId: upload.id, details: `${file.name} (${file.size} bytes) for ${reportDate}` });
    return ok({ upload, duplicateWarning: false }, 201);
  });
}
