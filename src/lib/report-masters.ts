// ─────────────────────────────────────────────────────────────────────────────
// MASTER REPORT TEMPLATE REGISTRY
//
// Each report type has ONE active master template — the original uploaded Word
// document that acts as the design foundation for generated reports. The file
// lives in uploads-storage/ (same directory as user uploads) and its sha256 is
// recorded so we can PROVE the master is never modified by report generation.
//
// The bundled assets in assets/report-templates/ are the original SBTS Group
// templates; they seed the registry on first use and act as a self-healing
// fallback if the stored copy ever goes missing.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from "crypto";
import { copyFile, mkdir, readFile, writeFile, stat, unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

export const STORAGE_DIR = "/home/z/my-project/uploads-storage";
const ASSETS_DIR = path.join(process.cwd(), "assets", "report-templates");

export type MasterReportType =
  | "AGENT_BPO"
  | "SUPERVISOR"
  | "TECH"
  | "SOCIAL"
  | "TEAM_LEAD"
  | "TL_SOCIAL";

/** Every master type the management API accepts (shared with the route). */
export const MASTER_REPORT_TYPES: MasterReportType[] = [
  "AGENT_BPO",
  "SUPERVISOR",
  "TECH",
  "SOCIAL",
  "TEAM_LEAD",
  "TL_SOCIAL",
];

export const MASTER_LABELS: Record<MasterReportType, string> = {
  AGENT_BPO: "BPO Call Centre Agents (Outbound)",
  SUPERVISOR: "BPO Supervisor",
  TECH: "Web Development & Technical Team",
  SOCIAL: "Social Media Team",
  TEAM_LEAD: "Team Lead (dynamic template)",
  TL_SOCIAL: "Social Media Team Lead",
};

interface BundledMaster {
  reportType: MasterReportType;
  file: string;
  originalName: string;
}

/** The shipped original SBTS Group templates. */
const BUNDLED: BundledMaster[] = [
  { reportType: "AGENT_BPO", file: "Daily_Report_Call_Centre.docx", originalName: "Daily Report Call Centre.docx" },
  { reportType: "SUPERVISOR", file: "Daily_Report_Supervisor.docx", originalName: "Daily_Report_Supervisor.docx" },
  { reportType: "TECH", file: "Daily_Report_Web_Development_Technical.docx", originalName: "Web Development and Technical Team Report.docx" },
  { reportType: "SOCIAL", file: "Daily_Report_Social_Media_Team.docx", originalName: "Daily_Report_Social_Media_Team.docx" },
  { reportType: "TL_SOCIAL", file: "Daily_Report_Social_Media_Team_Lead.docx", originalName: "SBTS-Daily-Report-Social Media Team-Lead.docx" },
];

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function ensureStorage(): Promise<void> {
  try {
    await stat(STORAGE_DIR);
  } catch {
    await mkdir(STORAGE_DIR, { recursive: true });
  }
}

/** Copy the bundled master for this type into uploads-storage if not already there. */
async function materialiseBundled(b: BundledMaster): Promise<string> {
  await ensureStorage();
  const storedName = `master-${b.reportType.toLowerCase()}-${b.file}`;
  const dest = path.join(STORAGE_DIR, storedName);
  try {
    await stat(dest);
  } catch {
    await copyFile(path.join(ASSETS_DIR, b.file), dest);
  }
  return storedName;
}

/**
 * Idempotent seed: every bundled master that has no DB row yet is registered.
 * Safe to call on every export / page load — it only writes when needed.
 */
export async function ensureMastersSeeded(): Promise<void> {
  const rows = await db.reportMasterTemplate.findMany();
  const have = new Set(rows.map((r) => r.reportType));
  for (const b of BUNDLED) {
    if (have.has(b.reportType)) continue;
    try {
      const storedName = await materialiseBundled(b);
      const buf = await readFile(path.join(STORAGE_DIR, storedName));
      await db.reportMasterTemplate.create({
        data: {
          reportType: b.reportType,
          storedName,
          originalName: b.originalName,
          sizeBytes: buf.length,
          fileHash: sha256(buf),
          updatedByName: "System (bundled SBTS master)",
        },
      });
    } catch {
      // bundled asset missing — skip, other masters still seed
    }
  }
}

export interface MasterFile {
  reportType: string;
  buffer: Buffer;
  originalName: string;
  fileHash: string;
}

/**
 * Fetch the active master for a report type. Self-heals: if the DB row points
 * at a missing file, the bundled copy is re-materialised and the row updated.
 */
let loaderOverride: ((reportType: string) => Promise<MasterFile | null>) | null = null;

/** Test hook (scripts only): inject a loader so fills can run without the DB. */
export function setMasterLoaderOverride(fn: ((reportType: string) => Promise<MasterFile | null>) | null): void {
  loaderOverride = fn;
}

export async function getMasterBuffer(reportType: string): Promise<MasterFile | null> {
  if (loaderOverride) return loaderOverride(reportType);
  await ensureMastersSeeded();
  const row = await db.reportMasterTemplate.findUnique({ where: { reportType } });
  if (!row) return null;
  try {
    const buffer = await readFile(path.join(STORAGE_DIR, row.storedName));
    return { reportType, buffer, originalName: row.originalName, fileHash: row.fileHash };
  } catch {
    const bundled = BUNDLED.find((b) => b.reportType === reportType);
    if (!bundled) return null;
    const storedName = await materialiseBundled(bundled);
    const buffer = await readFile(path.join(STORAGE_DIR, storedName));
    await db.reportMasterTemplate.update({
      where: { reportType },
      data: { storedName, sizeBytes: buffer.length, fileHash: sha256(buffer) },
    });
    return { reportType, buffer, originalName: row.originalName, fileHash: sha256(buffer) };
  }
}

/** Replace the master for a report type with an uploaded DOCX (admin action). */
export async function replaceMaster(
  reportType: string,
  buffer: Buffer,
  originalName: string,
  updatedBy?: { id: string; fullName: string } | null,
): Promise<void> {
  await ensureStorage();
  const ext = path.extname(originalName).toLowerCase() || ".docx";
  const storedName = `master-${reportType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await writeFile(path.join(STORAGE_DIR, storedName), buffer);
  const prev = await db.reportMasterTemplate.findUnique({ where: { reportType } });
  if (prev && prev.storedName !== storedName) {
    // keep the uploads dir tidy — the previous master file is no longer referenced
    await unlink(path.join(STORAGE_DIR, prev.storedName)).catch(() => {});
  }
  const data = {
    storedName,
    originalName: originalName.slice(0, 200),
    sizeBytes: buffer.length,
    fileHash: sha256(buffer),
    updatedById: updatedBy?.id ?? null,
    updatedByName: updatedBy?.fullName ?? null,
  };
  await db.reportMasterTemplate.upsert({
    where: { reportType },
    create: { reportType, ...data },
    update: data,
  });
}

/** All masters for the management UI. */
export async function listMasters() {
  await ensureMastersSeeded();
  const rows = await db.reportMasterTemplate.findMany({ orderBy: { reportType: "asc" } });
  const byType = new Map(rows.map((r) => [r.reportType, r]));
  const types: MasterReportType[] = ["AGENT_BPO", "SUPERVISOR", "TECH", "SOCIAL", "TL_SOCIAL", "TEAM_LEAD"];
  return types.map((t) => {
    const r = byType.get(t);
    return {
      reportType: t,
      label: MASTER_LABELS[t],
      originalName: r?.originalName ?? null,
      sizeBytes: r?.sizeBytes ?? null,
      fileHash: r?.fileHash ?? null,
      updatedByName: r?.updatedByName ?? null,
      updatedAt: r?.updatedAt ?? null,
      isBundled: BUNDLED.some((b) => b.reportType === t),
    };
  });
}
