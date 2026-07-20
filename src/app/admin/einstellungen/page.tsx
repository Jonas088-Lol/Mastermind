/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  FileCheck,
  Layers,
  LineChart,
  Palette,
  Shield,
  SlidersHorizontal,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea, type SchoolArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Einstellungen · Admin" };

interface SettingsEntry {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Nur anzeigen, wenn die Rolle diesen Bereich verwalten darf. */
  area: SchoolArea;
}

const ENTRIES: SettingsEntry[] = [
  {
    href: "/admin/einstellungen/funktionen",
    label: "Funktionen",
    description: "Einzelne Module für die Schule an- oder abschalten und zeitlich begrenzen.",
    icon: SlidersHorizontal,
    area: "einstellungen",
  },
  {
    href: "/admin/rechte",
    label: "Rechte",
    description: "Festlegen, was Lehrkräfte und Schüler dürfen — z. B. eigene Elternbriefe.",
    icon: UserCheck,
    area: "rechte",
  },
  {
    href: "/admin/branding",
    label: "Branding",
    description: "Farben, Logo und Anzeigename der Schule.",
    icon: Palette,
    area: "branding",
  },
  {
    href: "/admin/notenschluessel",
    label: "Notenschlüssel",
    description: "Mehrere Schlüssel anlegen, etwa für R- und M-Zweig.",
    icon: LineChart,
    area: "notenschluessel",
  },
  {
    href: "/admin/integrationen",
    label: "Integrationen",
    description: "Verbindungen zu externen Diensten.",
    icon: Layers,
    area: "integrationen",
  },
  {
    href: "/admin/einwilligungen",
    label: "Einwilligungen & Elternbriefe",
    description: "Formulare und Briefe einstellen, die Eltern digital bestätigen.",
    icon: FileCheck,
    area: "einwilligungen",
  },
  {
    href: "/admin/sicherheit",
    label: "Sicherheit",
    description: "Zwei-Faktor-Pflicht und Anmelde-Regeln.",
    icon: Shield,
    area: "sicherheit",
  },
  {
    href: "/admin/lizenz",
    label: "Lizenz",
    description: "Tarif, Plätze und Laufzeit.",
    icon: Award,
    area: "lizenz",
  },
];

export default async function AdminEinstellungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!canManageSchool(role)) redirect(ROLE_HOME[role]);
  if (!canAccessArea(role, "einstellungen")) redirect("/admin");

  // Nur Bereiche zeigen, die die Rolle auch öffnen darf.
  const entries = ENTRIES.filter((e) => canAccessArea(role, e.area));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Schulverwaltung
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Zentrale Konfiguration deiner Schule.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-bg"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{entry.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-fg">
                  {entry.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
