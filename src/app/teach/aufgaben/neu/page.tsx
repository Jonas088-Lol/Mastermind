import {
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardList,
  FileUp,
  Save,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Neue Aufgabe" };

const TEMPLATES = [
  { title: "Hausaufgabe", body: "Klassisch · 1 Tag · Standardgewichtung" },
  { title: "Wochen-Übung", body: "Bündel · 7 Tage · Selbstkontrolle möglich" },
  { title: "Online-Test", body: "Auto-bewertbar · Multiple Choice + Freitext" },
  { title: "Klassenarbeit", body: "Gewichtet · Druckbar · Mit Bewertungsraster" },
];

export default function NeueAufgabePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/teach/aufgaben"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zu Aufgaben
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              Neue Aufgabe · Schritt 1 von 3
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Aufgabe erstellen
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              KI hilft beim Formulieren · Bewertungsraster wird automatisch generiert.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Save className="size-3.5" />
              Als Entwurf speichern
            </Button>
            <Button size="sm">
              <Send className="size-3.5" />
              Veröffentlichen
            </Button>
          </div>
        </div>
      </header>

      <section className="border border-brand/40 bg-gradient-to-r from-brand/[0.08] to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center bg-brand text-brand-fg">
            <Sparkles className="size-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">
              KI-Aufgaben-Generator
            </p>
            <p className="mt-1 text-xs text-muted-fg">
              Beschreibe das Lernziel — die KI formuliert Aufgabe, Erwartungshorizont
              und Bewertungsraster passend zu deiner Klassenstufe.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="z. B. 'Quadratische Gleichungen mit pq-Formel anwenden, Klasse 9, mittlerer Schwierigkeit'"
                className="flex-1"
              />
              <Button>
                <Wand2 className="size-3.5" />
                Generieren
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Vorlage wählen</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.title}
                type="button"
                className={`group flex flex-col gap-2 bg-bg p-5 text-left transition-colors hover:bg-surface ${
                  i === 0 ? "border-l-2 border-l-brand" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="size-4 text-fg" strokeWidth={1.75} />
                  <p className="text-sm font-semibold">{t.title}</p>
                  {i === 0 && (
                    <Badge variant="brand">
                      <Check className="size-3" />
                      Aktiv
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-fg">{t.body}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              defaultValue="Aufgabe 6 — Quadratische Gleichungen anwenden"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="klasse">Klasse</Label>
              <select
                id="klasse"
                defaultValue="9b"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="9b">9b · Mathematik (26 Schüler)</option>
                <option value="10a">10a · Physik (24 Schüler)</option>
                <option value="8c">8c · Mathematik (28 Schüler)</option>
                <option value="11a">11a · Physik (20 Schüler)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Typ</Label>
              <select
                id="type"
                defaultValue="abgabe"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="hausaufgabe">Hausaufgabe</option>
                <option value="abgabe">Abgabe</option>
                <option value="test">Test</option>
                <option value="klassenarbeit">Klassenarbeit</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due">Abgabetermin</Label>
              <Input id="due" type="datetime-local" defaultValue="2026-04-30T18:00" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight">Gewichtung</Label>
              <select
                id="weight"
                defaultValue="1"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="1">Normal · 1×</option>
                <option value="2">Erhöht · 2×</option>
                <option value="3">Klassenarbeit · 3×</option>
                <option value="0">Übung · 0× (zählt nicht)</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aufgabenstellung</CardTitle>
          <Button variant="ghost" size="sm">
            <Sparkles className="size-3.5" />
            KI verbessern
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="border border-border bg-bg focus-within:border-fg/30">
            <textarea
              rows={8}
              defaultValue={`Wende die pq-Formel auf folgende Gleichungen an. Notiere alle Rechenschritte.\n\n1. x² + 4x − 12 = 0\n2. x² − 6x + 5 = 0\n3. x² + 2x + 1 = 0\n\nErkläre in 2–3 Sätzen, was die Diskriminante bei Aufgabe 3 aussagt.`}
              className="w-full resize-y bg-transparent p-3 text-sm leading-relaxed focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                Markdown · LaTeX · Bilder erlaubt
              </p>
              <Button size="sm" variant="ghost">
                <FileUp className="size-3.5" />
                Material anhängen
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Bewertungsraster</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              KI hat 4 Kriterien vorgeschlagen · 16 Punkte gesamt
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <Sparkles className="size-3.5" />
            KI · neu generieren
          </Button>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            <RubricRow label="pq-Formel korrekt angewendet" points={6} />
            <RubricRow label="Lösungsweg vollständig dokumentiert" points={4} />
            <RubricRow label="Diskriminante richtig interpretiert" points={4} />
            <RubricRow label="Sauberkeit & Form" points={2} />
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optionen</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Toggle label="KI-Korrektur aktiviert" detail="Vorbewertung · du behältst Endkontrolle" on />
          <Toggle label="Späte Abgaben akzeptieren" detail="Mit Hinweis & Punktabzug 10%" on />
          <Toggle label="Schüler dürfen sich gegenseitig sehen" detail="Anonymisiert · für Peer-Feedback" on={false} />
          <Toggle label="Auto-Reminder 2 Std. vor Abgabe" detail="Push an alle, die noch nicht abgegeben haben" on />
        </CardBody>
      </Card>

      <div className="flex flex-col items-center gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-muted-fg">
          <CalendarClock className="size-3.5" />
          Wird sofort veröffentlicht und benachrichtigt 26 Schüler
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save className="size-3.5" />
            Entwurf speichern
          </Button>
          <Button>
            <Send className="size-3.5" />
            Aufgabe veröffentlichen
          </Button>
        </div>
      </div>
    </div>
  );
}

function RubricRow({ label, points }: { label: string; points: number }) {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <div className="grid size-7 shrink-0 place-items-center bg-surface font-mono text-[10px] font-bold">
        {points}
      </div>
      <p className="flex-1 text-sm font-medium">{label}</p>
      <Button variant="ghost" size="sm">
        Bearbeiten
      </Button>
    </li>
  );
}

function Toggle({
  label,
  detail,
  on,
}: {
  label: string;
  detail: string;
  on: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative h-5 w-9 shrink-0 transition-colors ${
          on ? "bg-brand" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 bg-bg transition-[left] ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
