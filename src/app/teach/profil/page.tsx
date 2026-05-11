import {
  Award,
  Camera,
  Edit3,
  GraduationCap,
  Mail,
  Phone,
  Settings,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };

const SUBJECTS = ["Mathematik", "Physik"];

const KLASSEN = [
  { name: "9b", subject: "Mathe", students: 26 },
  { name: "10a", subject: "Physik", students: 24 },
  { name: "8c", subject: "Mathe", students: 28 },
  { name: "11a", subject: "Physik", students: 20 },
];

const QUALIFICATIONS = [
  { label: "Lehramt Sek I + II", detail: "LMU München · 2014" },
  { label: "Referendariat", detail: "Realschule München · 2016" },
  { label: "Fortbildung KI im Unterricht", detail: "Goethe-Institut · 2025" },
  { label: "Mentor · Lehrkräfte-Onboarding", detail: "seit 2024" },
];

const TEACHING_STATS = [
  { label: "Unterrichtsjahre", value: "10", icon: GraduationCap, tone: "text-fg" },
  { label: "Schüler aktuell", value: "98", icon: Users, tone: "text-brand" },
  { label: "Ø Klassen-Note", value: "2,4", icon: Award, tone: "text-success" },
  { label: "KI-Stunden gespart · Monat", value: "11,4 h", icon: Sparkles, tone: "text-info" },
] as const;

export default function TeachProfilPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-5">
          <div className="relative">
            <Avatar name="Markus Becker" size="lg" className="size-20 text-2xl" />
            <button
              type="button"
              aria-label="Avatar ändern"
              className="absolute -bottom-1 -right-1 grid size-7 place-items-center bg-fg text-bg transition-transform hover:scale-110"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              Lehrer · Realschule München
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Markus Becker
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-fg">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                becker@schule.de
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" />
                Sprechstunde Di · 13–14 Uhr
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit3 className="size-3.5" />
            Profil bearbeiten
          </Button>
          <Link
            href="/teach/einstellungen"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Settings className="size-3.5" />
            Einstellungen
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {TEACHING_STATS.map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {s.label}
              </p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Über mich</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm leading-relaxed">
                Mathe- und Physik-Lehrer mit 10 Jahren Erfahrung an der Realschule München.
                Spezialisiert auf datengestützten Unterricht und KI-Integration. Ich glaube
                an klare Bewertungsraster, individuelle Lernpfade und ehrliches Feedback.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {SUBJECTS.map((s) => (
                  <Badge key={s} variant="brand">
                    {s}
                  </Badge>
                ))}
                <Badge variant="outline">Klassenlehrer 9b</Badge>
                <Badge variant="outline">KI-Champion 2025</Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Meine Klassen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  4 Klassen · 98 Schüler · Schuljahr 2026/27
                </p>
              </div>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {KLASSEN.map((k) => (
                  <li
                    key={k.name}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface"
                  >
                    <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
                      <span className="font-mono text-xs font-bold">{k.name}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{k.subject}</p>
                      <p className="text-xs text-muted-fg">{k.students} Schüler</p>
                    </div>
                    <Link
                      href={`/teach/klassen/${k.name}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Cockpit
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualifikationen</CardTitle>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {QUALIFICATIONS.map((q) => (
                  <li
                    key={q.label}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <Star className="size-4 shrink-0 text-warning" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{q.label}</p>
                      <p className="text-xs text-muted-fg">{q.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sprechstunde</CardTitle>
            <Badge variant="success">Aktiv</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="border border-border bg-surface p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                Wöchentlich
              </p>
              <p className="mt-1 font-mono text-base font-bold">Dienstag · 13:00 – 14:00</p>
              <p className="mt-1 text-xs text-muted-fg">Raum B204 oder Video</p>
            </div>
            <Button className="w-full" variant="outline">
              Termin buchen
            </Button>
            <p className="text-center text-[10px] uppercase tracking-wider text-muted-fg">
              3 Termine diese Woche · 12 Slots offen
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
