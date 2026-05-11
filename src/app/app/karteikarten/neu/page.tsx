import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { createDeck } from "./actions";

export const metadata: Metadata = { title: "Neues Deck" };

export default async function NeueDeckPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const subjects = session.schoolId
    ? await prisma.subject.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, shortName: true, color: true },
      })
    : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <Link
          href="/app/karteikarten"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          ← Zurück zu Karteikarten
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Neues Deck erstellen</h1>
        <p className="mt-1 text-sm text-muted-fg">Erstelle ein neues Karteideck zum Lernen.</p>
      </header>

      <form action={createDeck} className="flex flex-col gap-6 border border-border bg-bg p-6">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
          >
            Deck-Name <span className="text-danger">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="z. B. Mathe Trigonometrie"
            className="border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="subjectId"
              className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
            >
              Fach (optional)
            </label>
            <select
              id="subjectId"
              name="subjectId"
              className="border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">Kein Fach</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.shortName})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="md">
            Deck erstellen
          </Button>
        </div>
      </form>
    </div>
  );
}
