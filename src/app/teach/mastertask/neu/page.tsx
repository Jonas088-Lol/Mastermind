import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { createMasterTask } from "../actions";

export default async function NeueMasterTaskPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const teacherClasses = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: { class: { select: { id: true, name: true } }, subject: { select: { name: true } } },
    orderBy: { class: { name: "asc" } },
  });

  // Deduplicate classes
  const classMap = new Map<string, { id: string; name: string }>();
  for (const tsc of teacherClasses) {
    if (!classMap.has(tsc.classId)) classMap.set(tsc.classId, tsc.class);
  }
  const classes = [...classMap.values()];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Neue MasterTask</h1>
        <p className="text-sm text-muted-foreground mt-1">Erstelle eine Lernaufgabe mit Materialien für deine Klasse</p>
      </div>

      <form action={createMasterTask} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Titel *</label>
            <input
              name="title"
              required
              placeholder="z.B. Kapitel 4 – Bruchrechnung"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Erklärung oder Hinweise zur Aufgabe …"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Klasse *</label>
            <select
              name="classId"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Klasse wählen …</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Fach</label>
            <input
              name="subject"
              placeholder="z.B. Mathematik"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Abgabedatum</label>
            <input
              name="dueAt"
              type="datetime-local"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Aufgabennummer</label>
            <input
              name="exerciseNr"
              placeholder="z.B. Aufgabe 3a"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold">Buchseiten (optional)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Buch</label>
              <input
                name="bookName"
                placeholder="z.B. Mathe live 9"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Seite von</label>
              <input
                name="bookPageFrom"
                type="number"
                min={1}
                placeholder="45"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Seite bis</label>
              <input
                name="bookPageTo"
                type="number"
                min={1}
                placeholder="48"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Aufgabe erstellen
          </button>
          <a
            href="/teach/mastertask"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-accent transition-colors"
          >
            Abbrechen
          </a>
        </div>
      </form>
    </div>
  );
}
