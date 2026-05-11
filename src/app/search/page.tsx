import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckSquare,
  ClipboardList,
  Layers,
  MessageSquare,
  Search as SearchIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Suche",
  description: "Suche durch alle Schul-Daten · Aufgaben, Klassen, Schüler, Karten.",
  robots: { index: false, follow: false },
};

type Hit = {
  title: string;
  body: string;
  href: string;
  scope: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const INDEX: Hit[] = [
  // Schüler
  {
    title: "Aufgabe 5 — Quadratische Gleichungen",
    body: "Mathe · 9b · Hr. Becker · fällig heute 18:00",
    href: "/app/aufgaben",
    scope: "Aufgabe",
    icon: CheckSquare,
  },
  {
    title: "Vokabeln Unit 7",
    body: "Englisch · Fr. Wagner · fällig heute 20:00",
    href: "/app/aufgaben",
    scope: "Aufgabe",
    icon: CheckSquare,
  },
  {
    title: "Bio · Photosynthese",
    body: "24 Karten · 5 fällig · KI-Deck",
    href: "/app/karteikarten",
    scope: "Karteikarten",
    icon: Layers,
  },
  {
    title: "Englisch · Unit 7 Vokabeln",
    body: "60 Karten · 7 fällig · Lehrer-Deck",
    href: "/app/karteikarten",
    scope: "Karteikarten",
    icon: Layers,
  },
  {
    title: "Quadratische Funktionen",
    body: "Mathe-Lernpfad · 8 Module · 5/8 erledigt",
    href: "/app/lernen",
    scope: "Lernpfad",
    icon: BookOpen,
  },
  {
    title: "Hebelgesetz & Drehmoment",
    body: "Physik-Lernpfad · 6 Module · 1/6 erledigt",
    href: "/app/lernen",
    scope: "Lernpfad",
    icon: BookOpen,
  },
  {
    title: "Stundenplan · Woche 11",
    body: "9. – 13. März · 1 Vertretung · 1 KA",
    href: "/app/plan",
    scope: "Stundenplan",
    icon: BookOpen,
  },
  {
    title: "Noten · alle Fächer",
    body: "Ø 2,3 · Beste: Englisch (1,8) · Schwächste: Physik (2,9)",
    href: "/app/noten",
    scope: "Noten",
    icon: ClipboardList,
  },

  // Lehrer
  {
    title: "Klasse 9b · Mathematik",
    body: "26 Schüler · Ø 2,4 · 3 Risiko-Schüler",
    href: "/teach/klassen/9b",
    scope: "Klasse",
    icon: Users,
  },
  {
    title: "Klasse 10a · Physik",
    body: "24 Schüler · Ø 2,8 · 5 Risiko-Schüler · Trend fallend",
    href: "/teach/klassen/10a",
    scope: "Klasse",
    icon: Users,
  },
  {
    title: "Klasse 8c · Mathematik",
    body: "28 Schüler · Ø 2,1 · 1 Risiko-Schüler · Trend steigend",
    href: "/teach/klassen/8c",
    scope: "Klasse",
    icon: Users,
  },
  {
    title: "Klasse 11a · Physik",
    body: "20 Schüler · Ø 2,9 · 4 Risiko-Schüler",
    href: "/teach/klassen/11a",
    scope: "Klasse",
    icon: Users,
  },
  {
    title: "Korrektur-Stapel · 23 Abgaben",
    body: "14 KI-bereit · ein Klick zum Annehmen",
    href: "/teach/korrektur",
    scope: "Korrektur",
    icon: ClipboardList,
  },
  {
    title: "KI-Generator · Klassenarbeit",
    body: "8 Aufgaben · 36 Punkte · Lehrplan-Score 92 %",
    href: "/teach/generator",
    scope: "KI",
    icon: ClipboardList,
  },
  {
    title: "Sandra Meier — Mutter von Lukas",
    body: "Nachricht: Mathe-Note besprechen, 16 Uhr",
    href: "/teach/nachrichten",
    scope: "Nachricht",
    icon: MessageSquare,
  },
  {
    title: "Familie Weber — Eltern von Tom",
    body: "Nachricht: Termin wegen schlechter Noten",
    href: "/teach/nachrichten",
    scope: "Nachricht",
    icon: MessageSquare,
  },

  // Schüler aus Klassen
  {
    title: "Anna Bauer · 9b",
    body: "Mathe 1,8 · Trend steigend · Anwesenheit 100%",
    href: "/teach/klassen/9b",
    scope: "Schüler",
    icon: Users,
  },
  {
    title: "Tom Weber · 10a",
    body: "Risiko-Schüler · 4,2 · 3 fehlende Abgaben",
    href: "/teach/klassen/10a",
    scope: "Schüler",
    icon: Users,
  },
  {
    title: "Lukas Meier · 9b",
    body: "Mathe 2,3 · Englisch 1,8 · Streak 14 Tage",
    href: "/teach/klassen/9b",
    scope: "Schüler",
    icon: Users,
  },
];

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const hits = query.length === 0 ? [] : filterIndex(INDEX, query);

  const groups = groupBy(hits, (h) => h.scope);

  return (
    <main className="min-h-screen bg-surface px-6 py-10 lg:px-10 lg:py-14">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-5">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Zurück
          </Link>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Suche</h1>
          <form action="/search" method="get" className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg" />
              <Input
                name="q"
                placeholder="Schüler, Klassen, Aufgaben, Karten, Lernpfade …"
                defaultValue={query}
                autoFocus
                className="h-12 pl-10 text-base"
              />
            </div>
            <Button type="submit" size="lg">
              Suchen
            </Button>
          </form>
          <p className="text-xs text-muted-fg">
            {query.length === 0
              ? "Tipp: probiere 'Anna', '9b', 'Photosynthese' oder 'Tom Weber'."
              : `${hits.length} Treffer für '${query}'`}
          </p>
        </header>

        {query.length === 0 ? (
          <EmptyState />
        ) : hits.length === 0 ? (
          <NoResults query={query} />
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([scope, items]) => (
              <section key={scope}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    {scope}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                    {items.length}
                  </span>
                </div>
                <ul className="divide-y divide-border border border-border bg-bg">
                  {items.map((hit) => (
                    <HitRow key={`${hit.scope}-${hit.title}`} hit={hit} query={query} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function HitRow({ hit, query }: { hit: Hit; query: string }) {
  const Icon = hit.icon;
  return (
    <li>
      <Link
        href={hit.href}
        className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface"
      >
        <span className="grid size-9 shrink-0 place-items-center bg-surface text-fg group-hover:bg-fg group-hover:text-bg">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{hit.scope}</Badge>
            <p className="truncate text-sm font-semibold">
              <Highlighted text={hit.title} query={query} />
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-fg">
            <Highlighted text={hit.body} query={query} />
          </p>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-fg transition-colors group-hover:text-brand" />
      </Link>
    </li>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-brand/20 text-fg">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function EmptyState() {
  const examples = ["Anna", "9b", "Photosynthese", "Korrektur", "Tom Weber"];
  return (
    <div className="grid gap-px border border-border bg-border sm:grid-cols-3 md:grid-cols-5">
      {examples.map((ex) => (
        <Link
          key={ex}
          href={`/search?q=${encodeURIComponent(ex)}`}
          className="bg-bg px-4 py-3 text-center text-sm transition-colors hover:bg-surface"
        >
          <span className="text-muted-fg">&bdquo;</span>
          {ex}
          <span className="text-muted-fg">&ldquo;</span>
        </Link>
      ))}
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div
      className={cn(
        "border border-dashed border-border bg-bg p-8 text-center"
      )}
    >
      <p className="text-base font-semibold">
        Keine Treffer für &bdquo;{query}&ldquo;
      </p>
      <p className="mt-2 text-sm text-muted-fg">
        Versuche kürzere Begriffe oder schau in der App-Navigation nach.
      </p>
    </div>
  );
}

function filterIndex(index: Hit[], q: string): Hit[] {
  const lowered = q.toLowerCase();
  return index.filter(
    (h) =>
      h.title.toLowerCase().includes(lowered) ||
      h.body.toLowerCase().includes(lowered) ||
      h.scope.toLowerCase().includes(lowered)
  );
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
