import {
  ArrowRight,
  Crown,
  FileText,
  Flame,
  Heart,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };

interface Group {
  slug: string;
  name: string;
  subject: string;
  members: number;
  unread: number;
  lastMessage: string;
  lastFrom: string;
  lastTime: string;
}

const GROUPS: Group[] = [
  {
    slug: "9b-mathe-ka",
    name: "9b · Klassenarbeit Mathe",
    subject: "Mathe",
    members: 18,
    unread: 7,
    lastMessage: "Hat jemand die Aufgabe 5b verstanden? Ich komm bei der pq-Formel nicht weiter.",
    lastFrom: "Lisa H.",
    lastTime: "vor 12 Min.",
  },
  {
    slug: "bio-lerngruppe",
    name: "Bio Lerngruppe Photosynthese",
    subject: "Bio",
    members: 6,
    unread: 0,
    lastMessage: "Top, dann morgen 16 Uhr in der Bibliothek!",
    lastFrom: "Greta",
    lastTime: "gestern",
  },
  {
    slug: "englisch-tandem",
    name: "Englisch-Tandem · Speaking",
    subject: "Englisch",
    members: 4,
    unread: 2,
    lastMessage: "I prepared three topics for tomorrow — check the doc.",
    lastFrom: "Ben S.",
    lastTime: "vor 3 Std.",
  },
];

interface RankEntry {
  rank: number;
  name: string;
  klasse: string;
  xp: number;
  delta: string;
  me?: boolean;
}

const LEADERBOARD: RankEntry[] = [
  { rank: 1, name: "Anna Bauer", klasse: "9b", xp: 4820, delta: "+340" },
  { rank: 2, name: "Bea Hertz", klasse: "8c", xp: 4710, delta: "+412" },
  { rank: 3, name: "Greta Hoffmann", klasse: "9b", xp: 4502, delta: "+290" },
  { rank: 7, name: "Lukas Meier", klasse: "9b", xp: 3980, delta: "+340", me: true },
  { rank: 8, name: "Hannes Müller", klasse: "9b", xp: 3870, delta: "+221" },
];

export default async function CommunityPage() {
  const dbNotes = await prisma.note.findMany({
    where: { isPublic: true },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lerncommunity · Realschule München
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Community
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Lernen mit deiner Klasse · moderiert · DSGVO-konform
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/community/notizen/neu" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus className="size-3.5" />
            Lerngruppe
          </Link>
          <Link href="/app/community/notizen/neu" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Notiz teilen
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Geteilte Lernnotizen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  Top-bewertete Notizen deiner Klassenstufe
                </p>
              </div>
              <Link
                href="/app/community/notizen"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Alle Notizen
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              {dbNotes.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <FileText className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold">Noch keine öffentlichen Notizen</p>
                  <p className="mt-1 text-xs text-muted-fg">
                    Sei die erste Person, die eine Lernnotiz teilt!
                  </p>
                  <Link
                    href="/app/community/notizen/neu"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand hover:underline"
                  >
                    <Plus className="size-3" />
                    Notiz erstellen
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {dbNotes.map((n) => (
                    <DbNoteRow key={n.id} note={n} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Lerngruppen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  Du bist in 3 Gruppen · 9 ungelesene Nachrichten
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Alle Gruppen
                <ArrowRight className="size-3.5" />
              </Button>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {GROUPS.map((g) => (
                  <GroupRow key={g.slug} group={g} />
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.08] to-transparent">
            <CardBody className="!p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Wochen-Challenge
                </p>
              </div>
              <p className="mt-3 text-base font-semibold leading-snug">
                Helfe 3 Klassenkameraden mit einer Antwort
              </p>
              <p className="mt-2 text-sm text-muted-fg">
                Belohnung: <span className="font-semibold text-fg">+250 XP</span> ·
                noch 4 Tage · 1 von 3 erledigt.
              </p>
              <Button className="mt-5 w-full">
                Challenge öffnen
                <ArrowRight className="size-3.5" />
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Klassen-Ranking</CardTitle>
              <Badge variant="outline">9b</Badge>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {LEADERBOARD.map((r) => (
                  <li
                    key={r.rank}
                    className={cn(
                      "flex items-center gap-3 px-5 py-2.5",
                      r.me && "bg-brand/[0.06]"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center font-mono text-xs font-bold",
                        r.rank === 1 && "bg-warning text-bg",
                        r.rank === 2 && "bg-fg/70 text-bg",
                        r.rank === 3 && "bg-fg/40 text-bg",
                        r.rank > 3 && "bg-surface text-muted-fg"
                      )}
                    >
                      {r.rank === 1 ? <Crown className="size-3.5" /> : r.rank}
                    </span>
                    <Avatar name={r.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          r.me ? "font-bold text-brand" : "font-semibold"
                        )}
                      >
                        {r.me ? "Du" : r.name}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-fg">
                        {r.klasse}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold tabular-nums">{r.xp}</p>
                      <p className="font-mono text-[10px] text-success">{r.delta}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schul-Statistik</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-fg">
                    <Users className="size-3.5" />
                    Aktive heute
                  </span>
                  <span className="font-mono font-bold">438</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-fg">
                    <FileText className="size-3.5" />
                    Geteilte Notizen
                  </span>
                  <span className="font-mono font-bold">2.847</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-fg">
                    <Flame className="size-3.5" />
                    Längster Streak
                  </span>
                  <span className="font-mono font-bold">93 Tage</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type DbNote = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: { name: string };
};

function DbNoteRow({ note }: { note: DbNote }) {
  const preview = note.content.slice(0, 120) + (note.content.length > 120 ? "…" : "");
  const dateStr = note.createdAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface lg:flex-row lg:items-center lg:gap-4">
      <div className="grid size-12 shrink-0 place-items-center bg-surface text-fg">
        <FileText className="size-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            <TrendingUp className="size-3" />
            Öffentlich
          </Badge>
        </div>
        <p className="mt-1 text-sm font-semibold">{note.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-fg">{preview}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {note.author.name} · {dateStr}
        </p>
      </div>
      <div className="hidden flex-col items-end gap-1 lg:flex">
        <span className="flex items-center gap-1 text-xs text-muted-fg">
          <Heart className="size-3" />0
        </span>
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: Group }) {
  return (
    <Link
      href={`/app/community/gruppe/${group.slug}`}
      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
    >
      <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
        <Users className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{group.name}</p>
          {group.unread > 0 && <Badge variant="brand">{group.unread}</Badge>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-fg">
          <span className="font-medium text-fg">{group.lastFrom}: </span>
          {group.lastMessage}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {group.members} Mitglieder · {group.lastTime}
        </p>
      </div>
    </Link>
  );
}
