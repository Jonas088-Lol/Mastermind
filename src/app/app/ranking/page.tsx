import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { levelFromXp, xpToNextLevel } from "@/lib/xp";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Klassen-Ranking" };

export default async function RankingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  if (!session.classId) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-muted-fg">Keine Klasse zugewiesen.</p>
      </div>
    );
  }

  const classmates = await prisma.user.findMany({
    where: { classId: session.classId, role: "student" },
    select: {
      id: true,
      name: true,
      xp: true,
      xpLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { amount: true, reason: true, createdAt: true },
      },
    },
    orderBy: { xp: "desc" },
  });

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: session.classId },
    select: { name: true },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Klasse {schoolClass?.name ?? "—"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Klassen-Ranking
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {classmates.length} Schüler · XP durch Aufgaben, Karteikarten & geteilte Notizen
        </p>
      </header>

      <ol className="space-y-3">
        {classmates.map((student, index) => {
          const level = levelFromXp(student.xp);
          const toNext = xpToNextLevel(student.xp);
          const pct = Math.round(((student.xp % 100) / 100) * 100);
          const isMe = student.id === session.userId;
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;

          return (
            <li key={student.id}>
              <Card className={cn(isMe && "border-brand/50 bg-brand/[0.03]")}>
                <CardBody className="!p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid size-9 shrink-0 place-items-center font-mono text-lg font-bold text-muted-fg">
                      {medal ?? `#${index + 1}`}
                    </div>
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{student.name}</p>
                        {isMe && <Badge variant="brand">Du</Badge>}
                        <Badge variant="outline">Level {level}</Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-muted-fg">{student.xp} XP</span>
                          <span className="text-muted-fg">{toNext} XP bis Level {level + 1}</span>
                        </div>
                        <Progress value={pct} tone="brand" className="h-1.5" />
                      </div>
                      {student.xpLogs.length > 0 && (
                        <ul className="mt-3 space-y-0.5">
                          {student.xpLogs.map((log, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-muted-fg">
                              <span className="font-mono font-bold text-success">+{log.amount}</span>
                              <span>{REASON_LABEL[log.reason] ?? log.reason}</span>
                              <span className="ml-auto font-mono text-[10px]">
                                {log.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Trophy className="size-4 text-warning" strokeWidth={1.75} />
                      <span className="font-mono text-sm font-bold">{student.xp}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  aufgabe_abgabe: "Aufgabe abgegeben",
  aufgabe_bewertet: "Aufgabe bewertet",
  karteikarte_session: "Karteikarten-Session",
  note_geteilt: "Notiz geteilt",
};
