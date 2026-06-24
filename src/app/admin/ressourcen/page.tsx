import { ArrowRight, Box, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Ressourcen · Admin" };

const CATEGORY_LABELS: Record<string, string> = {
  raum: "Raum",
  geraet: "Gerät / Koffer",
  material: "Material",
  sonstiges: "Sonstiges",
};

export default async function AdminRessourcenPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const resources = await prisma.resource.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Ressourcen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {resources.length} {resources.length === 1 ? "Ressource" : "Ressourcen"} · Räume, Geräte und mehr
          </p>
        </div>
        <Link href="/admin/ressourcen/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neue Ressource
        </Link>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Alle Ressourcen</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Hier verwaltete Ressourcen können von Lehrern reserviert werden.
            </p>
          </div>
          <Box className="size-4 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {resources.length === 0 ? (
            <div className="border-t border-border px-5 py-10 text-center text-sm text-muted-fg">
              Noch keine Ressourcen angelegt.{" "}
              <Link href="/admin/ressourcen/neu" className="font-semibold text-brand hover:underline">
                Erste Ressource erstellen
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.name}</p>
                    <p className="mt-0.5 text-xs text-muted-fg">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                      {r.description ? ` · ${r.description}` : ""}
                      {" · "}{r._count.bookings} Buchung{r._count.bookings !== 1 ? "en" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted-fg border border-border">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
