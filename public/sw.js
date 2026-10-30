/*
 * Kallmania Reporting — push notification service worker.
 *
 * Handles: incoming Web Push events → native OS notifications (including while
 * the site is backgrounded or closed, where the browser/platform supports it),
 * notification click routing into the app's hash-based deep links, and
 * subscription renewal after `pushsubscriptionchange`.
 *
 * Deliberately NO fetch/cache handlers: the app's existing caching and
 * navigation behavior must stay untouched — this worker exists only for push.
 */

const FALLBACK_URL = "#/notifications";

function safeUrl(u) {
  // Only same-origin hash routes are accepted as destinations.
  if (typeof u !== "string" || !u.startsWith("#/")) return FALLBACK_URL;
  return u;
}

self.addEventListener("push", (event) => {
  let payload = null;
  try {
    if (event.data) payload = event.data.json();
  } catch {
    try { payload = { title: event.data.text() }; } catch { payload = null; }
  }
  // Missing/invalid payloads still surface a valid notification rather than
  // silently dropping the event (browsers require showNotification on push).
  const title = payload && typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim().slice(0, 120)
    : "Kallmania Reporting";
  const body = payload && typeof payload.body === "string" ? payload.body.trim().slice(0, 240) : "";
  const url = safeUrl(payload && payload.url);
  const tag = payload && typeof payload.tag === "string" && payload.tag ? payload.tag : `push-${Date.now()}`;
  const severity = payload && payload.severity === "CRITICAL" ? true : false;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || "Open Kallmania Reporting for details.",
      icon: "/brand-login.webp",
      badge: "/logo.svg",
      tag, // same logical event (tag = event id) replaces itself → no duplicate stacks
      renotify: false,
      requireInteraction: false,
      silent: severity ? false : undefined,
      data: { url, eventId: tag },
    }).catch((err) => {
      console.error("[sw] showNotification failed:", err);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const target = (event.notification.data && safeUrl(event.notification.data.url)) || FALLBACK_URL;
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const origin = self.location.origin;
      // Focus an existing app tab and move it to the notification's page.
      for (const client of clients) {
        if (client.url.startsWith(origin)) {
          try { await client.navigate(target); } catch { /* hash change below still applies */ }
          const focused = await client.focus();
          // Ensure the hash route applied even if navigate() was a no-op.
          focused.postMessage({ type: "PUSH_NAVIGATE", url: target });
          return;
        }
      }
      // No app tab open: open a new one at the deep link (authentication is
      // enforced by the app itself after load).
      await self.clients.openWindow("/" + target);
    })()
  );
});

// The push service revoked/rotated the subscription (permission reset, browser
// cleanup). Best-effort renewal while the user still has a session; silent on
// failure — the server deactivates dead endpoints on 404/410 anyway.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const vapidRes = await fetch("/api/push/config");
        if (!vapidRes.ok) return;
        const { publicKey } = await vapidRes.json();
        if (!publicKey) return;
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });
        const json = sub.toJSON();
        await fetch("/api/push/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "subscribe", endpoint: sub.endpoint, keys: json.keys, label: "Renewed subscription" }),
        });
      } catch (err) {
        // Not logged in, unsupported, or offline — the user can re-enable from settings.
      }
    })()
  );
});
