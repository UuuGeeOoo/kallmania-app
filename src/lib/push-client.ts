"use client";

/**
 * Browser push subscription flow (client side).
 *
 * States (see PushState): unsupported · not-configured (admin hasn't set VAPID)
 * · permission-pending · permission-denied · unsubscribed · subscribed ·
 * registration-failed. Permission is only ever requested from a direct user
 * action (the Enable button); denied browsers are never re-prompted.
 */

export type PushState =
  | { kind: "unsupported"; reason: string }
  | { kind: "not-configured" }
  | { kind: "permission-pending" }
  | { kind: "permission-denied" }
  | { kind: "unsubscribed" }
  | { kind: "subscribed"; endpointTail?: string }
  | { kind: "registration-failed"; reason: string };

export interface PushSubscriptionDTO {
  id: string;
  label: string;
  active: boolean;
  createdAt: string;
  lastSuccessAt: string | null;
  endpointTail: string;
}

export interface PushTestResult { ok: boolean; message: string; outcomes: unknown[] }

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Human-readable device label stored with the subscription. */
export function browserLabel(): string {
  try {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] } };
    const ua = navigator.userAgent;
    let browser = "Browser";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\//.test(ua)) browser = "Opera";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua)) browser = "Safari";
    const platform = nav.userAgentData?.platform || (/Android/.test(ua) ? "Android" : /Win/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : "");
    return [browser, platform].filter(Boolean).join(" on ");
  } catch {
    return "Browser";
  }
}

function supportError(): string | null {
  if (typeof window === "undefined") return "Not running in a browser";
  if (!("serviceWorker" in navigator)) return "This browser does not support service workers.";
  if (!("PushManager" in window)) return "This browser does not support the Push API.";
  if (!("Notification" in window)) return "This browser does not support the Notifications API.";
  return null;
}

/** Permission state via the async Permissions API (authoritative), falling back
 *  to the static Notification.permission where the API is unavailable. The
 *  static property alone is unreliable in some headless/automation contexts. */
async function permissionState(): Promise<"granted" | "denied" | "default"> {
  try {
    const q = await navigator.permissions?.query({ name: "notifications" as PermissionName });
    if (q) return q.state === "prompt" ? "default" : (q.state as "granted" | "denied");
  } catch { /* Safari < 16 / unsupported name */ }
  if (typeof Notification !== "undefined") return Notification.permission;
  return "denied";
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? null;
  } catch {
    return null;
  }
}

/** Current end-to-end status: browser support → server config → permission → subscription (local + server row). */
export async function getPushStatus(): Promise<PushState> {
  const unsupported = supportError();
  if (unsupported) return { kind: "unsupported", reason: unsupported };
  const perm = await permissionState();
  if (perm === "denied") return { kind: "permission-denied" };

  let config: { configured: boolean; publicKey: string | null };
  try {
    const res = await fetch("/api/push/config");
    if (!res.ok) return { kind: "registration-failed", reason: "Could not load push configuration." };
    config = await res.json();
  } catch {
    return { kind: "registration-failed", reason: "Could not reach the server for push configuration." };
  }
  if (!config.configured || !config.publicKey) return { kind: "not-configured" };

  const registration = await getRegistration();
  const sub = registration ? await registration.pushManager.getSubscription().catch(() => null) : null;
  if (!sub) {
    if (perm === "default") return { kind: "permission-pending" };
    return { kind: "unsubscribed" };
  }
  // Confirm the server still holds this browser's subscription row.
  try {
    const res = await fetch("/api/push/subscriptions");
    const { subscriptions = [] } = (await res.json()) as { subscriptions: PushSubscriptionDTO[] };
    const tail = sub.endpoint.slice(-10);
    const mine = subscriptions.find((s) => s.endpointTail === tail);
    if (!mine) return { kind: "unsubscribed" };
    return mine.active
      ? { kind: "subscribed", endpointTail: tail }
      : { kind: "unsubscribed" }; // server marked inactive (expired) → re-enable to refresh
  } catch {
    return { kind: "registration-failed", reason: "Could not verify the subscription with the server." };
  }
}

/**
 * Full enable flow. MUST be called from a direct user action (click) so the
 * permission prompt is allowed. Confirms success only after the backend saved
 * the subscription.
 */
export async function enableBrowserNotifications(): Promise<PushState> {
  const unsupported = supportError();
  if (unsupported) return { kind: "unsupported", reason: unsupported };

  const configRes = await fetch("/api/push/config");
  const config = (await configRes.json()) as { configured: boolean; publicKey: string | null };
  if (!config.configured || !config.publicKey) return { kind: "not-configured" };

  let registration: ServiceWorkerRegistration;
  try {
    registration = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
  } catch (e) {
    return { kind: "registration-failed", reason: `Service worker registration failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  const permission = await Notification.requestPermission();
  if (permission === "denied") return { kind: "permission-denied" };
  const effective = permission === "default" ? await permissionState() : permission;
  if (effective === "denied") return { kind: "permission-denied" };

  let sub: PushSubscription;
  try {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  } catch (e) {
    return { kind: "registration-failed", reason: `Push subscription failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  const saveRes = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "subscribe", endpoint: json.endpoint, keys: json.keys, label: browserLabel() }),
  });
  if (!saveRes.ok) {
    await sub.unsubscribe().catch(() => {});
    return { kind: "registration-failed", reason: "The server could not save this subscription." };
  }
  return { kind: "subscribed", endpointTail: json.endpoint.slice(-10) };
}

/** Removes the current browser's subscription locally and on the server. */
export async function disableBrowserNotifications(): Promise<void> {
  const registration = await getRegistration();
  const sub = registration ? await registration.pushManager.getSubscription().catch(() => null) : null;
  if (sub) {
    await fetch("/api/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}

/** Ask the backend to send a real Web Push to this account's subscriptions. */
export async function sendTestPush(): Promise<PushTestResult> {
  const res = await fetch("/api/push/test", { method: "POST" });
  return (await res.json()) as PushTestResult;
}

/**
 * Wire two navigation sources into the app: notifications clicked while an app
 * tab is open (the service worker posts a PUSH_NAVIGATE message) and direct
 * hash changes (e.g. the SW's client.navigate). Returns a cleanup function.
 */
export function listenForPushNavigation(handler: (url: string) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; url?: string } | null;
    if (data?.type === "PUSH_NAVIGATE" && typeof data.url === "string") handler(data.url);
  };
  const onHashChange = () => {
    const hash = window.location.hash;
    if (hash.startsWith("#/")) handler(hash);
  };
  navigator.serviceWorker?.addEventListener("message", onMessage);
  window.addEventListener("hashchange", onHashChange);
  return () => {
    navigator.serviceWorker?.removeEventListener("message", onMessage);
    window.removeEventListener("hashchange", onHashChange);
  };
}
