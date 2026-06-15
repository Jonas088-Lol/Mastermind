import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { effectiveRole, getSession } from "@/lib/session";
import { createSubject } from "./actions";

export const metadata: Metadata = { title: "Fach erstellen · Admin" };

const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b",
];

export const SUBJECT_CATEGORIES = [
  { value: "allgemein",    label: "Allgemein" },
  { value: "mint",         label: "MINT" },
  { value: "sprachen",     label: "Sprachen" },
  { value: "gesellschaft", label: "Gesellschaft / Soziales" },
  { value: "kunst",        label: "Kunst, Musik & Sport" },
  { value: "beruflich",    label: "Beruflich" },
  { value: "wahlpflicht",  label: "Wahlpflicht / Wahlfach" },
];

export default async function NeuesFachPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/faecher" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Neues Fach</h1>
        </div>
      </header>

      <form action={createSubject} className="flex flex-col gap-5">
        {/* Fachtyp */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Fachtyp *</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_CATEGORIES.map((cat, i) => (
              <label key={cat.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand">
                  {cat.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Fachname *</label>
          <Input id="name" name="name" type="text" required placeholder="z. B. Mathematik" />
        </div>

        {/* Kürzel */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shortName" className="text-sm font-semibold">Kürzel *</label>
          <Input
            id="shortName"
            name="shortName"
            type="text"
            required
            maxLength={4}
            placeholder="z. B. M"
            className="w-24 font-mono uppercase"
          />
          <p className="text-xs text-muted-fg">Wird automatisch großgeschrieben. Max. 4 Zeichen.</p>
        </div>

        {/* Farbe */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Farbe</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <label key={c} className="relative cursor-pointer">
                <input type="radio" name="color" value={c} className="sr-only" defaultChecked={c === "#6366f1"} />
                <span
                  className="block size-8 rounded-lg border-2 border-transparent ring-offset-1 has-checked:ring-2 has-checked:ring-brand"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs text-muted-fg">
              <span>Eigene:</span>
              <input
                type="color"
                name="color"
                defaultValue="#6366f1"
                className="h-8 w-12 cursor-pointer rounded-lg border border-border bg-bg"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
          >
            Fach erstellen
          </button>
          <Link href="/admin/faecher" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
