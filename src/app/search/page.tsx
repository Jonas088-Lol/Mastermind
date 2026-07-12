/* Copyright 2026 Elian Schock, Jonas Schwenk */
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
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
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

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const role = effectiveRole(session);

  const hits: Hit[] = query.length === 0 ? [] : await search(session.userId, role, query);
  const groups = groupBy(hits, (h) => h.scope);

  return (
    <main className="min-h-screen bg-surface px-6 py-10 lg:px-10 lg:py-14">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-5">
          <Link
            href="/app"
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
              ? "Tipp: probiere einen Aufgaben-Titel, Schülernamen oder Klassennamen."
              : `${hits.length} Treffer für '${query}'`}
          </p>
        </header>

        {query.length === 0 ? (
          <EmptyState role={role} />
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
                    <HitRow key={`${hit.scope}-${hit.title}-${hit.href}`} hit={hit} query={query} />
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

async function search(userId: string, role: string, q: string): Promise<Hit[]> {
  const hits: Hit[] = [];

  if (role === "student") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { classId: true },
    });

    const [assignments, decks, paths] = await Promise.all([
      user?.classId
        ? prisma.assignment.findMany({
            where: { classId: user.classId, title: { contains: q } },
            select: { id: true, title: true, description: true, subject: { select: { name: true } }, dueAt: true },
            take: 10,
          })
        : [],
      prisma.flashcardDeck.findMany({
        where: { userId, name: { contains: q } },
        select: { id: true, name: true, subject: { select: { name: true } }, _count: { select: { cards: true } } },
        take: 10,
      }),
      prisma.learningPath.findMany({
        where: { title: { contains: q } },
        select: { id: true, title: true, description: true, subject: { select: { name: true } } },
        take: 10,
      }),
    ]);

    for (const a of assignments) {
      hits.push({
        title: a.title,
        body: `${a.subject.name} · fällig ${a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}${a.description ? " · " + a.description.slice(0, 60) : ""}`,
        href: `/app/aufgaben/${a.id}`,
        scope: "Aufgabe",
        icon: CheckSquare,
      });
    }
    for (const d of decks) {
      hits.push({
        title: d.name,
        body: `${d._count.cards} Karten${d.subject ? " · " + d.subject.name : ""}`,
        href: `/app/karteikarten/${d.id}`,
        scope: "Karteikarten",
        icon: Layers,
      });
    }
    for (const p of paths) {
      hits.push({
        title: p.title,
        body: `${p.subject.name}${p.description ? " · " + p.description.slice(0, 60) : ""}`,
        href: `/app/lernen/${p.id}`,
        scope: "Lernpfad",
        icon: BookOpen,
      });
    }
  }

  if (role === "teacher") {
    const [students, classes, assignments] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "student",
          name: { contains: q },
          schoolClass: { assignments: { some: { teacherId: userId } } },
        },
        select: { id: true, name: true, classId: true, schoolClass: { select: { name: true } } },
        take: 10,
      }),
      prisma.schoolClass.findMany({
        where: {
          name: { contains: q },
          assignments: { some: { teacherId: userId } },
        },
        select: { id: true, name: true, _count: { select: { students: true } } },
        take: 10,
      }),
      prisma.assignment.findMany({
        where: { teacherId: userId, title: { contains: q } },
        select: { id: true, title: true, subject: { select: { name: true } }, class: { select: { name: true } }, dueAt: true },
        take: 10,
      }),
    ]);

    for (const s of students) {
      hits.push({
        title: s.name,
        body: `Klasse ${s.schoolClass?.name ?? "—"}`,
        href: s.schoolClass?.name
          ? `/teach/klassen/${encodeURIComponent(s.schoolClass.name)}/schueler/${s.id}`
          : `/teach/klassen`,
        scope: "Schüler",
        icon: Users,
      });
    }
    for (const c of classes) {
      hits.push({
        title: c.name,
        body: `${c._count.students} Schüler`,
        href: `/teach/klassen/${encodeURIComponent(c.name)}`,
        scope: "Klasse",
        icon: Users,
      });
    }
    for (const a of assignments) {
      hits.push({
        title: a.title,
        body: `${a.subject.name} · ${a.class.name} · fällig ${a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`,
        href: `/teach/aufgaben/${a.id}`,
        scope: "Aufgabe",
        icon: CheckSquare,
      });
    }
  }

  if (role === "parent") {
    // Search children's assignments by finding linked students
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: userId },
      select: { student: { select: { id: true, name: true, classId: true } } },
    });
    const studentIds = links.map((l) => l.student.id);
    const classIds = links.map((l) => l.student.classId).filter(Boolean) as string[];

    const assignments = await prisma.assignment.findMany({
      where: { classId: { in: classIds }, title: { contains: q } },
      select: { id: true, title: true, subject: { select: { name: true } }, dueAt: true },
      take: 10,
    });
    for (const a of assignments) {
      hits.push({
        title: a.title,
        body: `${a.subject.name} · fällig ${a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`,
        href: `/eltern/aufgaben`,
        scope: "Aufgabe",
        icon: CheckSquare,
      });
    }

    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, name: { contains: q } },
      select: { id: true, name: true, schoolClass: { select: { name: true } } },
    });
    for (const s of students) {
      hits.push({
        title: s.name,
        body: `Klasse ${s.schoolClass?.name ?? "—"}`,
        href: `/eltern`,
        scope: "Kind",
        icon: Users,
      });
    }
  }

  // All roles: message threads
  const threads = await prisma.messageThread.findMany({
    where: {
      participants: { some: { userId } },
      subject: { contains: q },
    },
    select: { id: true, subject: true },
    take: 5,
  });
  for (const t of threads) {
    const prefix = role === "teacher" ? "/teach" : role === "parent" ? "/eltern" : "/app";
    hits.push({
      title: t.subject,
      body: "Nachrichtenthread",
      href: `${prefix}/nachrichten/${t.id}`,
      scope: "Nachricht",
      icon: MessageSquare,
    });
  }

  return hits;
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

function EmptyState({ role }: { role: string }) {
  const examples =
    role === "teacher"
      ? ["Klasse 9b", "Anna Bauer", "Mathe", "Physik"]
      : role === "student"
      ? ["Mathe", "Biologie", "Vokabeln", "Lernpfad"]
      : ["Hausaufgaben", "Note", "Klasse"];
  return (
    <div className="grid gap-px border border-border bg-border sm:grid-cols-4">
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
    <div className={cn("border border-dashed border-border bg-bg p-8 text-center")}>
      <p className="text-base font-semibold">
        Keine Treffer für &bdquo;{query}&ldquo;
      </p>
      <p className="mt-2 text-sm text-muted-fg">
        Versuche kürzere Begriffe oder schau in der App-Navigation nach.
      </p>
    </div>
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
