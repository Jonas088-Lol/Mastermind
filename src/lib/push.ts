/* Copyright 2026 Elian Schock, Jonas Schwenk */
import webpush from "web-push";
import { logger } from "@/lib/logger";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
  attempt = 1
): Promise<boolean> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 410 Gone = subscription expired, don't retry
    if (status === 410) {
      logger.warn("push: subscription expired, skipping", { endpoint: subscription.endpoint.slice(0, 60) });
      return false;
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return sendPushNotification(subscription, payload, attempt + 1);
    }
    logger.error("push: send failed after retries", err, { endpoint: subscription.endpoint.slice(0, 60) });
    return false;
  }
}

export const vapidPublicKey = VAPID_PUBLIC;

// Native FCM/APNs tokens are stored via /api/push/native-token with
// p256dh set to the platform name instead of a real web-push key.
const NATIVE_PLATFORMS = new Set(["android", "ios", "native"]);
function isNativeSub(s: { p256dh: string }): boolean {
  return NATIVE_PLATFORMS.has(s.p256dh);
}

export async function pushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string; data?: Record<string, string>; category?: string }
): Promise<void> {
  if (userIds.length === 0) return;
  const { prisma } = await import("@/lib/db/client");
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const nativeSubs = subs.filter(isNativeSub);
  const webSubs = subs.filter((s) => !isNativeSub(s));

  // ── Native push via FCM ──────────────────────────────────────────────────
  const expiredTokens: string[] = [];
  if (nativeSubs.length > 0) {
    const { sendFcm } = await import("@/lib/fcm");
    await Promise.allSettled(
      nativeSubs.map(async (s) => {
        const { expired } = await sendFcm(s.endpoint, payload);
        if (expired) expiredTokens.push(s.endpoint);
      })
    );
    if (expiredTokens.length > 0) {
      await prisma.pushSubscription
        .deleteMany({ where: { endpoint: { in: expiredTokens } } })
        .catch(() => {});
    }
  }

  // ── Web push via VAPID ───────────────────────────────────────────────────
  let webFailed = 0;
  if (webSubs.length > 0 && VAPID_PUBLIC && VAPID_PRIVATE) {
    const results = await Promise.allSettled(webSubs.map((s) => sendPushNotification(s, payload)));
    webFailed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
  }

  if (webFailed > 0 || expiredTokens.length > 0) {
    logger.warn("push: some notifications failed", {
      web: webSubs.length,
      webFailed,
      native: nativeSubs.length,
      nativeExpired: expiredTokens.length,
    });
  }
}
