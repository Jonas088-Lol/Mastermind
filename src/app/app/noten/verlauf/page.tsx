import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { buildGradeTrend } from "@/lib/grade-trend";
import { getFavoriteSubjects } from "@/lib/actions/grade-prefs";
import { GradeTrendView } from "@/components/grades/GradeTrend";

export const metadata: Metadata = { title: "Notenverlauf" };

export default async function NotenVerlaufPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [{ allPoints, subjects }, favorites] = await Promise.all([
    buildGradeTrend(session.userId),
    getFavoriteSubjects(session.userId),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/app/noten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notenverlauf</h1>
          <p className="mt-0.5 text-sm text-muted-fg">Dein Durchschnitt über die Zeit</p>
        </div>
      </header>

      <GradeTrendView allPoints={allPoints} subjects={subjects} favorites={favorites} />
    </div>
  );
}
