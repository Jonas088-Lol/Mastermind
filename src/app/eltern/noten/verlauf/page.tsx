import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { buildGradeTrend } from "@/lib/grade-trend";
import { getFavoriteSubjects } from "@/lib/actions/grade-prefs";
import { GradeTrendView } from "@/components/grades/GradeTrend";

export const metadata: Metadata = { title: "Notenverlauf" };

export default async function ElternNotenVerlaufPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect("/");

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true } } },
  });
  const favorites = await getFavoriteSubjects(session.userId);

  const children = await Promise.all(
    links.map(async (l) => ({
      student: l.student,
      trend: await buildGradeTrend(l.student.id),
    }))
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <Link href="/eltern/noten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notenverlauf</h1>
          <p className="mt-0.5 text-sm text-muted-fg">Notenentwicklung deiner Kinder</p>
        </div>
      </header>

      {children.length === 0 ? (
        <p className="text-sm text-muted-fg">Kein Kind verknüpft.</p>
      ) : (
        children.map(({ student, trend }) => (
          <section key={student.id} className="flex flex-col gap-4">
            {children.length > 1 && <h2 className="text-lg font-bold">{student.name}</h2>}
            <GradeTrendView
              allPoints={trend.allPoints}
              subjects={trend.subjects}
              favorites={favorites}
            />
          </section>
        ))
      )}
    </div>
  );
}
