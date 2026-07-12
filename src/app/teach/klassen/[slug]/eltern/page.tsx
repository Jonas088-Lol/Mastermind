/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

interface PageParams { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Eltern Klasse ${decodeURIComponent(slug)}` };
}

export default async function ElternKontaktePage({ params }: PageParams) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const schoolClass = await prisma.schoolClass.findFirst({
    where: { name: decodeURIComponent(slug), schoolId: session.schoolId ?? "" },
    select: { id: true, name: true },
  });
  if (!schoolClass) notFound();

  const students = await prisma.user.findMany({
    where: { classId: schoolClass.id, role: "student" },
    select: {
      id: true,
      name: true,
      parentLinks: {
        include: {
          parent: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalParents = students.reduce((s, st) => s + st.parentLinks.length, 0);
  const withoutParents = students.filter((s) => s.parentLinks.length === 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/teach/klassen/${encodeURIComponent(slug)}`}
          className="text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Klasse {schoolClass.name}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">Elternkontakte</h1>
          <p className="mt-0.5 text-sm text-muted-fg">
            {totalParents} verknüpfte Elternteile · {withoutParents.length} Schüler ohne Elternkonto
          </p>
        </div>
      </header>

      {students.length === 0 ? (
        <p className="text-sm text-muted-fg">Keine Schüler in dieser Klasse.</p>
      ) : (
        <div className="flex flex-col gap-px border border-border">
          {students.map((student) => (
            <div key={student.id} className="flex items-start gap-4 bg-bg px-5 py-4 hover:bg-surface">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{student.name}</p>
                {student.parentLinks.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-fg/60 italic">Kein Elternkonto verknüpft</p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {student.parentLinks.map(({ parent }) => (
                      <li key={parent.id} className="flex items-center gap-3">
                        <Users className="size-3.5 shrink-0 text-muted-fg" />
                        <span className="text-sm text-muted-fg">{parent.name}</span>
                        <a
                          href={`mailto:${parent.email}`}
                          className="ml-auto flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          <Mail className="size-3" />
                          {parent.email}
                        </a>
                        <Link
                          href={`/teach/nachrichten/neu?to=${parent.id}`}
                          className={buttonVariants({ variant: "secondary", size: "sm" })}
                        >
                          Nachricht
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutParents.length > 0 && (
        <div className="border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <span className="font-semibold">{withoutParents.length} Schüler</span> haben kein verlinktes Elternkonto:{" "}
          {withoutParents.map((s) => s.name).join(", ")}.
        </div>
      )}
    </div>
  );
}
