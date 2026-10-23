/**
 * Employment type + work schedule helpers.
 *
 * Employment: FULL_TIME (standard 8-hour shift) | PART_TIME (fewer hours and/or
 * fewer days — every combination is allowed: all workdays with a few hours, or
 * a few days with a few hours).
 *
 * Working days are stored on User.workDays as a 7-character mask, Monday first:
 *   "1111100" = Mon–Fri (default)   "1010101" = Mon,Wed,Fri,Sun
 * Positions 5 and 6 (Sat, Sun) are the weekend — setting them assigns weekend work.
 * Shift hours live on User.shiftStart / User.shiftEnd as 24h "HH:MM" strings.
 */

export type EmploymentType = "FULL_TIME" | "PART_TIME";
export const EMPLOYMENT_TYPES: EmploymentType[] = ["FULL_TIME", "PART_TIME"];

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
};

/** Full-time agents work an 8-hour shift (default 09:00–17:00, Mon–Fri). */
export const FULL_TIME_DEFAULT = { workDays: "1111100", shiftStart: "09:00", shiftEnd: "17:00" };

export const WORKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKEND = new Set([5, 6]);

export function isEmploymentType(v: unknown): v is EmploymentType {
  return v === "FULL_TIME" || v === "PART_TIME";
}

export function isValidWorkDays(v: unknown): v is string {
  return typeof v === "string" && /^[01]{7}$/.test(v) && v.includes("1");
}

export function isValidTime(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Decimal hours between two HH:MM times (null when the window is invalid). */
export function shiftHours(start: string, end: string): number | null {
  if (!isValidTime(start) || !isValidTime(end)) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
}

export function includesWeekend(mask: string): boolean {
  return mask.split("").some((c, i) => c === "1" && WEEKEND.has(i));
}

/** Weekday index (0=Mon … 6=Sun) of a YYYY-MM-DD date, or -1 when unparseable. */
export function workdayIndexOf(dateISO: string): number {
  const d = new Date(dateISO + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? -1 : (d.getUTCDay() + 6) % 7;
}

/**
 * Is the given date (YYYY-MM-DD) one of this person's scheduled working days?
 * Falls back to the Mon–Fri default when no valid mask is stored, so full-timers
 * keep their expected behaviour. Used by overdue-report alerts, consolidated
 * "missing" lists and dashboard "expected to report" counts — a part-timer who
 * is off on a given date is never flagged for it.
 */
export function worksOn(mask: string | null | undefined, dateISO: string): boolean {
  const idx = workdayIndexOf(dateISO);
  if (idx < 0) return false;
  const m = mask && isValidWorkDays(mask) ? mask : FULL_TIME_DEFAULT.workDays;
  return m[idx] === "1";
}

/** Human summary of the mask: "Mon–Fri", "Mon, Wed, Fri", "Every day". */
export function formatWorkDays(mask: string): string {
  if (!isValidWorkDays(mask)) return "—";
  const days = mask.split("").map((c, i) => (c === "1" ? i : -1)).filter((i) => i >= 0);
  if (days.length === 7) return "Every day";
  // collapse consecutive runs into ranges
  const parts: string[] = [];
  let s = days[0], prev = days[0];
  for (let k = 1; k <= days.length; k++) {
    const d = days[k];
    if (d === prev + 1) { prev = d; continue; }
    parts.push(s === prev ? WORKDAY_SHORT[s] : `${WORKDAY_SHORT[s]}–${WORKDAY_SHORT[prev]}`);
    s = d; prev = d;
  }
  return parts.join(", ");
}

/** One-line schedule summary, e.g. "Part-time · Mon, Wed, Fri · 09:00–13:00 (4h/day)". */
export function describeSchedule(u: { employmentType?: string | null; workDays?: string | null; shiftStart?: string | null; shiftEnd?: string | null }): string {
  const type = EMPLOYMENT_LABELS[(u.employmentType as EmploymentType) || "FULL_TIME"];
  const days = formatWorkDays(u.workDays || FULL_TIME_DEFAULT.workDays);
  const start = u.shiftStart || FULL_TIME_DEFAULT.shiftStart;
  const end = u.shiftEnd || FULL_TIME_DEFAULT.shiftEnd;
  const hrs = shiftHours(start, end);
  return `${type} · ${days} · ${start}–${end}${hrs ? ` (${hrs % 1 === 0 ? hrs : hrs.toFixed(2)}h/day)` : ""}`;
}

export function weeklyHours(u: { workDays?: string | null; shiftStart?: string | null; shiftEnd?: string | null }): number | null {
  const perDay = shiftHours(u.shiftStart || FULL_TIME_DEFAULT.shiftStart, u.shiftEnd || FULL_TIME_DEFAULT.shiftEnd);
  if (perDay === null) return null;
  const days = (u.workDays || FULL_TIME_DEFAULT.workDays).split("").filter((c) => c === "1").length;
  return Math.round(perDay * days * 100) / 100;
}
