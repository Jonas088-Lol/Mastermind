import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exportUserData } from "@/lib/privacy/data-subject";
import { rateLimit } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/audit";

// GET /api/me/export — DSGVO-Selbstauskunft (Art. 15/20).
// Jeder eingeloggte Nutzer kann seine EIGENEN Daten als JSON exportieren.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Export ist teuer (viele Queries) → eng limitieren.
  const rl = await rateLimit({ scope: "data-export", key: session.userId, limit: 3, windowSec: 3600 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Zu viele Export-Anfragen. Bitte später erneut." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const data = await exportUserData(session.userId);

  await auditLog({
    action: "data.export",
    actorId: session.userId,
    targetId: session.userId,
    details: { kind: "self-service" },
  }).catch(() => undefined);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meine-daten-${date}.json"`,
    },
  });
}
