import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Arbeitsblätter" };

const DIFFICULTY_LABEL: Record<string, string> = {
  leicht: "Leicht",
  mittel: "Mittel",
  schwer: "Schwer",
};

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  leicht: "success",
  mittel: "warning",
  schwer: "danger",
};

export default async function ArbeitsblatterPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const worksheets = await prisma.worksheet.findMany({
    where: { creatorId: session.userId },
    include: {
      subject: { select: { name: true } },
      _count: { select: { items: true, assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrerzentrum</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Arbeitsblätter</h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">{worksheets.length} Arbeitsblätter</span>
          </p>
        </div>
        <Link href="/teach/arbeitsblatter/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neues Arbeitsblatt
        </Link>
      </header>

      {worksheets.length === 0 ? (
        <div className="grid place-items-center border border-border bg-bg p-16 text-center">
          <FileText className="size-10 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Noch keine Arbeitsblätter</p>
          <p className="mt-1 text-sm text-muted-fg">Erstelle dein erstes interaktives Arbeitsblatt.</p>
          <Link href="/teach/arbeitsblatter/neu" className={buttonVariants({ size: "sm", className: "mt-6" })}>
            <Plus className="size-3.5" />
            Neues Arbeitsblatt
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {worksheets.map((w) => (
            <Card key={w.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={DIFFICULTY_VARIANT[w.difficulty] ?? "neutral"}>
                      {DIFFICULTY_LABEL[w.difficulty] ?? w.difficulty}
                    </Badge>
                    <Badge variant={w.status === "published" ? "success" : "neutral"}>
                      {w.status === "published" ? "Veröffentlicht" : "Entwurf"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug">{w.title}</p>
                  {w.subject && (
                    <p className="mt-0.5 text-xs text-muted-fg">{w.subject.name}</p>
                  )}
                </div>
              </CardHeader>
              <CardBody className="flex flex-1 flex-col justify-between !pt-0">
                <div className="flex gap-4 text-xs text-muted-fg">
                  <span>
                    <span className="font-semibold text-fg">{w._count.items}</span> Items
                  </span>
                  <span>
                    <span className="font-semibold text-fg">{w._count.assignments}</span> Zuweisungen
                  </span>
                </div>
                <Link
                  href={`/teach/arbeitsblatter/${w.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4 w-full" })}
                >
                  Bearbeiten
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
