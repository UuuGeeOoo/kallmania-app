import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    console.error("API error:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return fail(msg, 500);
  }
}

export function safeParse<T>(json: string | unknown[] | object | null | undefined, fallback: T): T {
  if (json === null || json === undefined || json === "") return fallback;
  if (typeof json === "object") return json as T; // already-parsed JSON from client
  try {
    return JSON.parse(json as string) as T;
  } catch {
    return fallback;
  }
}

export function toDateOrNull(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v.length === 10 ? v + "T00:00:00.000Z" : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
