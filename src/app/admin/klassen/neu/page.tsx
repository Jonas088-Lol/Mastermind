import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { effectiveRole, getSession } from "@/lib/session";
import { createClass } from "./actions";

export const metadata: Metadata = { title: "Klasse erstellen" };

export default async function NeueKlassePage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/klassen" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Neue Klasse</h1>
        </div>
      </header>

      <form action={createClass} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Klassenbezeichnung</label>
          <Input id="name" name="name" type="text" required placeholder="z. B. 9b oder 10A" />
          <p className="text-xs text-muted-fg">Wird automatisch in Großbuchstaben umgewandelt.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="grade" className="text-sm font-semibold">Jahrgang</label>
          <select
            id="grade" name="grade" required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Jahrgang wählen…</option>
            {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>Klasse {g}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90">
            Klasse erstellen
          </button>
          <Link href="/admin/klassen" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
