"use client";

import {
  ArrowRight,
  Atom,
  Bookmark,
  Calculator,
  FileText,
  Languages,
  Leaf,
  Lightbulb,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_PROMPTS = [
  { icon: Calculator, label: "Mathe-Aufgabe erklären", subject: "Mathe" },
  { icon: Atom, label: "Physik-Versuch durchsprechen", subject: "Physik" },
  { icon: Languages, label: "Englisch-Vokabeln üben", subject: "Englisch" },
  { icon: Leaf, label: "Bio-Konzept verstehen", subject: "Bio" },
  { icon: FileText, label: "Text zusammenfassen", subject: "Allgemein" },
  { icon: Lightbulb, label: "Klassenarbeit vorbereiten", subject: "Allgemein" },
];

interface RecentTopic {
  title: string;
  subject: string;
  time: string;
}

interface TutorSidebarProps {
  recentTopics: RecentTopic[];
  onSelect: (text: string) => void;
}

export function TutorSidebar({
  recentTopics,
  onSelect,
}: TutorSidebarProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Schnellstart</CardTitle>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          <ul className="divide-y divide-border border-t border-border">
            {QUICK_PROMPTS.map((q) => (
              <li key={q.label}>
                <button
                  type="button"
                  onClick={() => onSelect(q.label)}
                  className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface"
                >
                  <span className="grid size-8 shrink-0 place-items-center bg-surface text-fg group-hover:bg-fg group-hover:text-bg">
                    <q.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{q.label}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-fg">
                      {q.subject}
                    </p>
                  </span>
                  <ArrowRight className="size-3.5 text-muted-fg transition-colors group-hover:text-brand" />
                </button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Themen</CardTitle>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {recentTopics.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-center text-sm text-muted-fg">
              Noch keine Themen gespeichert.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {recentTopics.map((t) => (
                <li key={t.title}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.title)}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-surface"
                  >
                    <Bookmark className="mt-0.5 size-3.5 shrink-0 text-muted-fg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-fg">
                        {t.subject} · {t.time}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
