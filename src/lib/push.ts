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

export async function pushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || userIds.length === 0) return;
  const { prisma } = await import("@/lib/db/client");
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  const results = await Promise.allSettled(subs.map((s) => sendPushNotification(s, payload)));
  const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
  if (failed > 0) logger.warn("push: some notifications failed", { total: subs.length, failed });
}
