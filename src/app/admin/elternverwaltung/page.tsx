/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { linkParentToStudent, unlinkParentFromStudent } from "./actions";

export const metadata: Metadata = { title: "Elternverwaltung · Admin" };

export default async function AdminElternverwaltungPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const adminUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { schoolId: true },
  });
  const schoolId = adminUser?.schoolId ?? session.schoolId ?? "";

  const [links, parents, students] = await Promise.all([
    prisma.parentStudentLink.findMany({
      where: { parent: { schoolId } },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, name: true, klasse: true } },
      },
      orderBy: { parent: { name: "asc" } },
    }),
    prisma.user.findMany({
      where: { schoolId, role: "parent" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: "student" },
      select: { id: true, name: true, klasse: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Group links by parent
  const byParent = new Map<
    string,
    {
      parent: { id: string; name: string; email: string };
      children: { linkId: string; student: { id: string; name: string; klasse: string | null } }[];
    }
  >();
  for (const link of links) {
    if (!byParent.has(link.parentId)) {
      byParent.set(link.parentId, { parent: link.parent, children: [] });
    }
    byParent.get(link.parentId)!.children.push({ linkId: link.id, student: link.student });
  }
  const groupedLinks = Array.from(byParent.values());

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Elternverwaltung
          <Badge variant="info" className="ml-3 align-middle text-base">
            {links.length}
          </Badge>
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {parents.length} Elternteile · {links.length} Verknüpfungen
        </p>
      </header>

      {/* Existing links */}
      <Card>
        <CardHeader>
          <CardTitle>Eltern-Kind-Verknüpfungen</CardTitle>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {groupedLinks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-fg">
              Noch keine Verknüpfungen vorhanden.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {groupedLinks.map(({ parent, children }) => (
                <li key={parent.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{parent.name}</p>
                      <p className="text-xs text-muted-fg">{parent.email}</p>
                      <ul className="mt-2 space-y-1.5">
                        {children.map(({ linkId, student }) => (
                          <li key={linkId} className="flex items-center gap-3">
                            <Badge variant="neutral">{student.klasse ?? "—"}</Badge>
                            <span className="text-sm">{student.name}</span>
                            <form action={unlinkParentFromStudent.bind(null, linkId)}>
                              <button
                                type="submit"
                                className={buttonVariants({ variant: "ghost", size: "sm" })}
                              >
                                Entfernen
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Create link form */}
      <Card>
        <CardHeader>
          <CardTitle>Neue Verknüpfung erstellen</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={linkParentToStudent} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="parentId"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg"
              >
                Elternteil
              </label>
              <select
                id="parentId"
                name="parentId"
                required
                className="w-full border border-border bg-bg px-3 py-2 text-sm"
              >
                <option value="">Bitte wählen…</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="studentId"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg"
              >
                Schüler/in
              </label>
              <select
                id="studentId"
                name="studentId"
                required
                className="w-full border border-border bg-bg px-3 py-2 text-sm"
              >
                <option value="">Bitte wählen…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.klasse ? `(${s.klasse})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonVariants({})}>
              Verknüpfen
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
