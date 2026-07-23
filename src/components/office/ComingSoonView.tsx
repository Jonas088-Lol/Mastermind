/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { Folder, Database, type LucideIcon } from "lucide-react";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";

/**
 * Platzhalter für MasterOffice-Module, die spezifiziert, aber noch nicht gebaut
 * sind (MasterFolder, MasterVault). Zeigt Zweck + geplante Funktionen, damit die
 * Module in der Navigation schon auffindbar sind. Wird durch die echte
 * Implementierung ersetzt (siehe Roadmap).
 */
export async function ComingSoonView({
  module: mod,
}: {
  module: "folder" | "vault";
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");

  const meta: Record<
    "folder" | "vault",
    { eyebrow: string; title: string; icon: LucideIcon; lead: string; points: string[] }
  > = {
    folder: {
      eyebrow: "MasterOffice",
      title: "MasterFolder",
      icon: Folder,
      lead: "Dein persönlicher Ordner — überall gleich, auch offline.",
      points: [
        "Dateien offline öffnen, erstellen und bearbeiten",
        "Automatische Synchronisation auf allen Geräten",
        "Konflikte werden als Kopie behalten — nichts geht verloren",
        "Nur ausgewählte Ordner offline halten (spart Speicher)",
      ],
    },
    vault: {
      eyebrow: "MasterOffice",
      title: "MasterVault",
      icon: Database,
      lead: "Deine persönliche, komprimierte Akte — alles an einem sicheren Ort.",
      points: [
        "Alle Dateien, Fortschritte und Dokumente gebündelt",
        "Datenexport als eine Akte (DSGVO-Auskunft)",
        "Beim Schulwechsel einfach mitnehmen",
        "Zugriff für andere nur feldgenau nach Berechtigung",
      ],
    },
  };

  const m = meta[mod];
  const Icon = m.icon;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">{m.eyebrow}</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <Icon className="size-8 text-brand" strokeWidth={1.5} />
          {m.title}
        </h1>
        <p className="mt-2 text-sm text-muted-fg">{m.lead}</p>
      </header>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
          In Entwicklung
        </div>
        <p className="mt-4 text-sm text-muted-fg">Geplante Funktionen:</p>
        <ul className="mt-3 space-y-2">
          {m.points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
