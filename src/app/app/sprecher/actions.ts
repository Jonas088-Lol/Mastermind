"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { pushToUsers } from "@/lib/push";

/**
 * Sprecher-Broadcasts:
 * - Schülersprecher → alle Schüler der Schule
 * - Klassensprecher → Schüler der eigenen Klasse
 * Die Berechtigung wird serverseitig anhand der Zusatzrollen geprüft.
 */
export async function sendSprecherBroadcast(formData: FormData): Promise<{ error?: string; sent?: number }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/login");
  if (!session.schoolId) return { error: "Keine Schule zugeordnet" };

  const features = await getStudentFeatures(session.userId);
  const isSchuelersprecher = features.includes("schuelersprecher");
  const isKlassensprecher = features.includes("klassensprecher");
  if (!isSchuelersprecher && !isKlassensprecher) return { error: "Keine Berechtigung" };

  const scope = (formData.get("scope") as string | null) ?? "";
  const subject = (formData.get("subject") as string | null)?.trim().slice(0, 150) ?? "";
  const message = (formData.get("message") as string | null)?.trim().slice(0, 2000) ?? "";
  if (!subject || !message) return { error: "Betreff und Nachricht sind Pflicht" };

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, classId: true },
  });

  let where;
  let senderLabel;
  if (scope === "school" && isSchuelersprecher) {
    where = { schoolId: session.schoolId, role: "student" };
    senderLabel = "Schülersprecher";
  } else if (scope === "class" && isKlassensprecher && me?.classId) {
    where = { schoolId: session.schoolId, role: "student", classId: me.classId };
    senderLabel = "Klassensprecher";
  } else {
    return { error: "Ungültiger Empfängerkreis" };
  }

  const recipients = await prisma.user.findMany({ where, select: { id: true } });
  const others = recipients.filter((r) => r.id !== session.userId);

  await prisma.appNotification.createMany({
    data: others.map((r) => ({
      userId: r.id,
      type: "broadcast",
      title: `📣 ${subject}`,
      body: `${message}\n\n— ${me?.name ?? "Sprecher"} (${senderLabel})`,
      linkUrl: null,
    })),
  });

  pushToUsers(others.map((r) => r.id), {
    title: `📣 ${subject}`,
    body: message.slice(0, 140),
    url: "/notifications",
  }).catch(() => {});

  return { sent: others.length };
}
