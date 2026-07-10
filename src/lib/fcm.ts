import { JWT } from "google-auth-library";
import { logger } from "@/lib/logger";

/**
 * Native push via Firebase Cloud Messaging (HTTP v1 API).
 *
 * Config: set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON of a Firebase
 * service account (Project settings → Service accounts → Generate new private
 * key). The project_id in that JSON is used as the FCM project.
 *
 * If the env var is missing, all sends are no-ops (returns false) so the app
 * runs fine without FCM configured.
 */

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let cachedClient: JWT | null = null;
let cachedProjectId: string | null = null;
let initFailed = false;

function getClient(): { client: JWT; projectId: string } | null {
  if (initFailed) return null;
  if (cachedClient && cachedProjectId) {
    return { client: cachedClient, projectId: cachedProjectId };
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    initFailed = true;
    return null;
  }
  try {
    const sa = JSON.parse(raw) as {
      client_email: string;
      private_key: string;
      project_id: string;
    };
    cachedClient = new JWT({
      email: sa.client_email,
      // Support keys stored with literal "\n" (e.g. single-line env vars).
      key: sa.private_key.replace(/\\n/g, "\n"),
      scopes: [FCM_SCOPE],
    });
    cachedProjectId = sa.project_id;
    return { client: cachedClient, projectId: cachedProjectId };
  } catch (err) {
    logger.error("fcm: invalid FIREBASE_SERVICE_ACCOUNT_JSON", err);
    initFailed = true;
    return null;
  }
}

export function isFcmConfigured(): boolean {
  return getClient() !== null;
}

/**
 * Send a single push to one FCM device token.
 * Returns true on success, false on failure. `expired` signals the token is
 * unregistered and its DB row should be deleted by the caller.
 */
export async function sendFcm(
  token: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; expired: boolean }> {
  const ctx = getClient();
  if (!ctx) return { ok: false, expired: false };

  const message = {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.url ? { url: payload.url } : undefined,
      android: { priority: "high" as const, notification: { default_sound: true } },
    },
  };

  try {
    const accessToken = await ctx.client.getAccessToken();
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${ctx.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );
    if (res.ok) return { ok: true, expired: false };

    // 404 UNREGISTERED / 400 invalid token → token is dead, drop it.
    const expired = res.status === 404 || res.status === 400;
    const detail = await res.text().catch(() => "");
    if (!expired) {
      logger.warn("fcm: send failed", { status: res.status, detail: detail.slice(0, 200) });
    }
    return { ok: false, expired };
  } catch (err) {
    logger.error("fcm: send error", err);
    return { ok: false, expired: false };
  }
}
