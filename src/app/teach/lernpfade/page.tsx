import {
  ArrowRight,
  Edit,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { deleteLearningPath } from "./actions";

export const metadata: Metadata = { title: "Lernpfade" };

export default async function LernpfadePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const paths = await prisma.learningPath.findMany({
    where: { createdById: session.userId },
    include: {
      subject: { select: { name: true, color: true } },
      _count: { select: { modules: true, progress: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lehrer-Cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Lernpfade</h1>
          <p className="mt-1 text-sm text-muted-fg">{paths.length} erstellt</p>
        </div>
        <Link href="/teach/lernpfade/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neuer Pfad
        </Link>
      </header>

      {paths.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <GraduationCap className="size-10 text-muted-fg" strokeWidth={1.5} />
              <p className="text-base font-semibold">Noch keine Lernpfade erstellt</p>
              <p className="text-sm text-muted-fg">
                Erstelle deinen ersten Lernpfad mit interaktiven Quizfragen.
              </p>
              <Link href="/teach/lernpfade/neu" className={buttonVariants()}>
                Ersten Pfad erstellen
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paths.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border border-border bg-bg p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: p.subject.color + "22", color: p.subject.color }}
                  >
                    {p.subject.name}
                  </span>
                </div>
                <p className="mt-1 font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted-fg">
                  {p._count.modules} Module · {p._count.progress} Abschlüsse von Schülern
                </p>
              </div>
              <Link
                href={`/teach/lernpfade/${p.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Edit className="size-3.5" />
                Bearbeiten
              </Link>
              <form action={deleteLearningPath.bind(null, p.id)}>
                <Button type="submit" variant="ghost" size="icon" aria-label="Lernpfad löschen">
                  <Trash2 className="size-4 text-muted-fg" strokeWidth={1.75} />
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
