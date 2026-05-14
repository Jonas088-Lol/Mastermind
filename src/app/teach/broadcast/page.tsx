import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendTeacherBroadcast } from "./actions";

export const metadata: Metadata = { title: "Broadcast · Lehrer" };

export default async function TeacherBroadcastPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: { class: { select: { id: true, name: true } } },
  });

  const seen = new Set<string>();
  const classes = tscEntries
    .filter((t) => { if (seen.has(t.classId)) return false; seen.add(t.classId); return true; })
    .map((t) => ({ id: t.class.id, name: t.class.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer-Cockpit</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Broadcast-Nachricht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Sende eine Systemnachricht an alle Schüler oder Eltern einer Klasse.
        </p>
      </header>

      <form action={sendTeacherBroadcast} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Klasse</label>
          <select
            name="classId"
            required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Klasse wählen…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Empfänger</label>
          <div className="flex gap-4">
            {[
              { value: "students", label: "Schüler" },
              { value: "parents", label: "Eltern" },
              { value: "both", label: "Beide" },
            ].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="target" value={opt.value} defaultChecked={opt.value === "students"} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Betreff</label>
          <input
            name="subject"
            type="text"
            required
            placeholder="z. B. Hausaufgaben für Montag"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Nachricht</label>
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Text der Nachricht…"
            className="border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-fg">
          <strong className="font-semibold text-fg">Hinweis:</strong> Diese Nachricht wird sofort als
          App-Benachrichtigung gesendet und kann nicht zurückgerufen werden.
        </div>

        <button
          type="submit"
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Nachricht senden
        </button>
      </form>
    </div>
  );
}
