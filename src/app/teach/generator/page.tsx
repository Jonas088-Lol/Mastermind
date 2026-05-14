import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getAiQuota } from "@/lib/db/store";
import { getSession, effectiveRole } from "@/lib/session";
import { GeneratorClient } from "./GeneratorClient";

export const metadata: Metadata = { title: "KI-Generator" };

function relativeTime(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 3600) return `vor ${Math.max(1, Math.floor(sec / 60))} Min.`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} Std.`;
  if (sec < 7 * 86400) return `vor ${Math.floor(sec / 86400)} Tag${Math.floor(sec / 86400) === 1 ? "" : "en"}`;
  return date.toLocaleDateString("de-DE");
}

export default async function GeneratorPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/");

  const [tscList, recentAssignmentsRaw, quota] = await Promise.all([
    prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
    prisma.assignment.findMany({
      where: { teacherId: session.userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        maxPoints: true,
        class: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getAiQuota(session.email),
  ]);

  const recentAssignments = recentAssignmentsRaw.map((a) => ({
    id: a.id,
    title: a.title,
    klasse: a.class.name,
    when: relativeTime(a.createdAt),
    submissionCount: a._count.submissions,
    maxPoints: a.maxPoints,
  }));

  return (
    <GeneratorClient
      tscList={tscList}
      recentAssignments={recentAssignments}
      quotaUsed={quota.used}
      quotaLimit={quota.limit}
    />
  );
}
