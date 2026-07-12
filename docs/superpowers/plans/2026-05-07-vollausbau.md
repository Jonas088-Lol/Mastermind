<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# MasterMind Vollausbau — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständiger Ausbau von Schüler-Modul, Admin-Klassenmanagement, Lehrer-Einladung, Nachrichten-Berechtigungen, Stundenplan-Konfiguration und Eltern/Admin-Nachrichten.

**Architecture:** Feature-by-feature mit Prisma-Migrationen für jede Schemaänderung. Kein Test-Framework vorhanden — Verifikation durch TypeScript-Check (`npx tsc --noEmit`) und manuelle Überprüfung. Nachrichten-Berechtigungen über Server-Actions, keine Client-Side-Filterung.

**Tech Stack:** Next.js 15 App Router, Prisma + SQLite, TypeScript, Tailwind CSS, Lucide Icons, Server Actions, `nodemailer` (bereits via `@/lib/email`)

---

## Dateistruktur-Übersicht

### Neue Dateien
- `prisma/schema.prisma` — neue Modelle: XpLog, NoteImage, SchoolPeriodConfig
- `prisma/migrations/` — automatisch via `prisma migrate dev`
- `src/app/admin/klassen/neu/page.tsx` — Formular: Klasse erstellen
- `src/app/admin/klassen/neu/actions.ts` — Server Action: Klasse anlegen
- `src/app/admin/nutzer/einladen/page.tsx` — Formular: Lehrer einladen
- `src/app/admin/nutzer/einladen/actions.ts` — Einladungs-E-Mail + Token
- `src/app/admin/stundenplan/page.tsx` — Stundenzeiten-Konfig + Stundenplan-Editor
- `src/app/admin/stundenplan/actions.ts` — CRUD für TimetableEntry + SchoolPeriodConfig
- `src/app/admin/nachrichten/page.tsx` — Admin Posteingang
- `src/app/admin/nachrichten/neu/page.tsx` — Neue Nachricht (Admin)
- `src/app/admin/nachrichten/neu/actions.ts` — Thread erstellen
- `src/app/admin/nachrichten/[threadId]/page.tsx` — Thread-Ansicht
- `src/app/eltern/nachrichten/neu/page.tsx` — Neue Nachricht (Eltern → Lehrer)
- `src/app/eltern/nachrichten/neu/actions.ts` — Thread erstellen (nur Lehrer als Empfänger)
- `src/app/app/community/notizen/[id]/page.tsx` — Notiz-Detail mit Löschen-Button
- `src/app/app/community/notizen/[id]/actions.ts` — Server Action: Notiz löschen
- `src/app/api/upload/notes/route.ts` — Bild-Upload Endpoint
- `src/app/app/ranking/page.tsx` — Klassen-Ranking mit XP-Detail
- `src/lib/xp.ts` — XP-Vergabe-Logik + Level-Berechnung

### Geänderte Dateien
- `prisma/schema.prisma` — XpLog, NoteImage, SchoolPeriodConfig, `xp` auf User
- `src/app/app/community/notizen/page.tsx` — Löschen-Button für eigene Notizen
- `src/app/app/community/notizen/neu/page.tsx` — Bild-Upload-Feld
- `src/app/app/nachrichten/neu/page.tsx` — Empfänger-Filter nach Rolle
- `src/app/app/nachrichten/neu/actions.ts` — Rollen-Prüfung im Server
- `src/app/admin/klassen/page.tsx` — "Neue Klasse"-Button → Link zu /admin/klassen/neu
- `src/app/admin/nutzer/page.tsx` — "Lehrer einladen"-Button → Link
- `src/app/admin/layout.tsx` — Nav-Eintrag: Nachrichten
- `src/app/eltern/layout.tsx` — Nav-Link "Neue Nachricht"
- `src/app/teach/page.tsx` — Stundenzeiten aus DB statt Hardcode
- `src/app/app/page.tsx` — XP + Level-Anzeige im Schüler-Dashboard

---

## Task 1: Schema — XP-System

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Schritt 1: `xp`-Feld zu User + XpLog-Modell hinzufügen**

In `prisma/schema.prisma`, nach dem `authoredNotes`-Feld in `User`:

```prisma
  xp     Int @default(0)
  xpLogs XpLog[]
```

Neues Modell am Ende der Datei hinzufügen:

```prisma
model XpLog {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount       Int
  reason       String   // "aufgabe_abgabe" | "karteikarte" | "note_geteilt" | "aufgabe_bewertet"
  referenceId  String?  // ID der Aufgabe/Note etc.
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
}
```

- [ ] **Schritt 2: Migration ausführen**

```bash
npx prisma migrate dev --name add-xp-system
```

Erwartete Ausgabe: Migration erfolgreich, neue Tabelle `XpLog`, Spalte `xp` auf `User`.

- [ ] **Schritt 3: TypeScript-Check**

```bash
npx tsc --noEmit
```

Erwartete Ausgabe: keine Fehler

---

## Task 2: Schema — NoteImage + SchoolPeriodConfig

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Schritt 1: NoteImage + SchoolPeriodConfig zu Schema hinzufügen**

Im `Note`-Modell folgende Relation ergänzen:
```prisma
  images NoteImage[]
```

Neue Modelle am Ende der Datei:

```prisma
model NoteImage {
  id        String   @id @default(cuid())
  noteId    String
  note      Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  filename  String
  mimeType  String
  size      Int
  createdAt DateTime @default(now())

  @@index([noteId])
}

model SchoolPeriodConfig {
  id        String @id @default(cuid())
  schoolId  String
  school    School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  period    Int    // 1–9
  startTime String // "08:00"
  endTime   String // "08:45"

  @@unique([schoolId, period])
  @@index([schoolId])
}
```

Im `School`-Modell ergänzen:
```prisma
  periodConfigs SchoolPeriodConfig[]
```

- [ ] **Schritt 2: Migration ausführen**

```bash
npx prisma migrate dev --name add-note-images-period-config
```

- [ ] **Schritt 3: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 3: XP-Logik-Modul

**Files:**
- Create: `src/lib/xp.ts`

- [ ] **Schritt 1: `src/lib/xp.ts` erstellen**

```typescript
import { prisma } from "@/lib/db/client";

export const XP_REWARDS = {
  aufgabe_abgabe: 20,
  aufgabe_bewertet: 10,
  karteikarte_session: 5,
  note_geteilt: 15,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = levelFromXp(xp);
  return currentLevel * 100 - xp;
}

export async function awardXp(
  userId: string,
  reason: XpReason,
  referenceId?: string
): Promise<void> {
  const amount = XP_REWARDS[reason];
  await prisma.$transaction([
    prisma.xpLog.create({
      data: { userId, amount, reason, referenceId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    }),
  ]);
}
```

- [ ] **Schritt 2: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 4: Klassen-Ranking-Seite

**Files:**
- Create: `src/app/app/ranking/page.tsx`

- [ ] **Schritt 1: Ranking-Seite erstellen**

```typescript
import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { levelFromXp, xpToNextLevel } from "@/lib/xp";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Klassen-Ranking" };

export default async function RankingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  if (!session.classId) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-muted-fg">Keine Klasse zugewiesen.</p>
      </div>
    );
  }

  const classmates = await prisma.user.findMany({
    where: { classId: session.classId, role: "student" },
    select: {
      id: true,
      name: true,
      xp: true,
      xpLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { amount: true, reason: true, createdAt: true },
      },
    },
    orderBy: { xp: "desc" },
  });

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: session.classId },
    select: { name: true },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Klasse {schoolClass?.name ?? "—"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Klassen-Ranking
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {classmates.length} Schüler · XP durch Aufgaben, Karteikarten & geteilte Notizen
        </p>
      </header>

      <ol className="space-y-3">
        {classmates.map((student, index) => {
          const level = levelFromXp(student.xp);
          const toNext = xpToNextLevel(student.xp);
          const pct = Math.round(((student.xp % 100) / 100) * 100);
          const isMe = student.id === session.userId;
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;

          return (
            <li key={student.id}>
              <Card className={cn(isMe && "border-brand/50 bg-brand/[0.03]")}>
                <CardBody className="!p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid size-9 shrink-0 place-items-center font-mono text-lg font-bold text-muted-fg">
                      {medal ?? `#${index + 1}`}
                    </div>
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{student.name}</p>
                        {isMe && <Badge variant="brand">Du</Badge>}
                        <Badge variant="outline">Level {level}</Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-muted-fg">{student.xp} XP</span>
                          <span className="text-muted-fg">{toNext} XP bis Level {level + 1}</span>
                        </div>
                        <Progress value={pct} tone="brand" className="h-1.5" />
                      </div>
                      {student.xpLogs.length > 0 && (
                        <ul className="mt-3 space-y-0.5">
                          {student.xpLogs.map((log, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-muted-fg">
                              <span className="font-mono font-bold text-success">+{log.amount}</span>
                              <span>{REASON_LABEL[log.reason] ?? log.reason}</span>
                              <span className="ml-auto font-mono text-[10px]">
                                {log.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Trophy className="size-4 text-warning" strokeWidth={1.75} />
                      <span className="font-mono text-sm font-bold">{student.xp}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  aufgabe_abgabe: "Aufgabe abgegeben",
  aufgabe_bewertet: "Aufgabe bewertet",
  karteikarte_session: "Karteikarten-Session",
  note_geteilt: "Notiz geteilt",
};
```

- [ ] **Schritt 2: Ranking-Link in der Nav ergänzen**

In `src/app/app/layout.tsx`, im `items`-Array nach Community:
```typescript
  { href: "/app/ranking", label: "Ranking", icon: "trophy" },
```

Hinweis: Das `trophy`-Icon muss in `src/components/app/Sidebar.tsx` zum Icon-Map ergänzt werden — prüfe dort, wie das gemacht wird, und füge `"trophy": Trophy` aus lucide-react hinzu.

- [ ] **Schritt 3: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 5: XP bei Aufgaben-Abgabe vergeben

**Files:**
- Modify: `src/app/app/aufgaben/[id]/actions.ts`

- [ ] **Schritt 1: `awardXp` bei Abgabe aufrufen**

In `src/app/app/aufgaben/[id]/actions.ts` nach dem Erstellen/Updaten der Submission:

```typescript
import { awardXp } from "@/lib/xp";

// nach dem Submission-Update/Create:
await awardXp(session.userId, "aufgabe_abgabe", submissionId);
```

Finde die existierende submit-Action in der Datei und füge `awardXp` direkt nach dem `prisma.submission.upsert`/`create`-Aufruf ein.

- [ ] **Schritt 2: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 6: Notizen — Löschen

**Files:**
- Create: `src/app/app/community/notizen/[id]/page.tsx`
- Create: `src/app/app/community/notizen/[id]/actions.ts`
- Modify: `src/app/app/community/notizen/page.tsx`

- [ ] **Schritt 1: Delete-Action erstellen**

`src/app/app/community/notizen/[id]/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function deleteNote(noteId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { authorId: true },
  });

  if (!note || note.authorId !== session.userId) return;

  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath("/app/community/notizen");
  redirect("/app/community/notizen");
}
```

- [ ] **Schritt 2: Notiz-Detail-Seite mit Löschen-Button**

`src/app/app/community/notizen/[id]/page.tsx`:

```typescript
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { deleteNote } from "./actions";

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id }, select: { title: true } });
  return { title: note?.title ?? "Notiz" };
}

export default async function NoteDetailPage({ params }: PageParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      images: { select: { id: true, filename: true } },
    },
  });

  if (!note) notFound();
  if (!note.isPublic && note.authorId !== session.userId) notFound();

  const isOwner = note.authorId === session.userId;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/app/community/notizen" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Notiz · {note.author.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{note.title}</h1>
        </div>
        {isOwner && (
          <form action={deleteNote.bind(null, note.id)}>
            <Button type="submit" variant="ghost" size="sm" className="text-danger hover:text-danger">
              <Trash2 className="size-3.5" />
              Löschen
            </Button>
          </form>
        )}
      </div>

      <div className="border border-border bg-bg p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
      </div>

      {note.images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {note.images.map((img) => (
            <img
              key={img.id}
              src={`/uploads/notes/${img.filename}`}
              alt="Notiz-Bild"
              className="w-full border border-border object-contain"
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Schritt 3: Notizliste — Löschen-Button + Links**

In `src/app/app/community/notizen/page.tsx` die NOTES-Platzhalter durch DB-Daten ersetzen und für eigene Notizen einen Löschen-Button anzeigen.

Ersetze die gesamte Seite mit:

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { deleteNote } from "./[id]/actions";

export const metadata: Metadata = { title: "Notizen · Community" };

export default async function CommunityNotizenPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notes = await prisma.note.findMany({
    where: {
      OR: [{ isPublic: true }, { authorId: session.userId }],
    },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Geteilte Notizen</h1>
          <p className="text-sm text-muted-fg">{notes.length} Notizen in deiner Klasse</p>
        </div>
        <Link href="/app/community/notizen/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Notiz teilen
        </Link>
      </header>

      {notes.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <StickyNote className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-fg">Noch keine Notizen geteilt.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const isOwner = n.authorId === session.userId;
            return (
              <li key={n.id}>
                <Card className="transition-colors hover:bg-surface">
                  <CardBody className="!p-5">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center bg-surface">
                        <StickyNote className="size-5 text-brand" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/app/community/notizen/${n.id}`}>
                          <p className="font-semibold hover:text-brand">{n.title}</p>
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-fg">
                          {n.author.name} · {n.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          {!n.isPublic && " · Privat"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/community/notizen/${n.id}`}
                          className="text-xs font-medium text-muted-fg hover:text-brand"
                        >
                          <ArrowRight className="size-3.5" />
                        </Link>
                        {isOwner && (
                          <form action={deleteNote.bind(null, n.id)}>
                            <button
                              type="submit"
                              className="grid size-7 place-items-center text-muted-fg transition-colors hover:text-danger"
                              title="Notiz löschen"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Schritt 4: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 7: Notizen — Bild-Upload

**Files:**
- Create: `src/app/api/upload/notes/route.ts`
- Modify: `src/app/app/community/notizen/neu/page.tsx`

- [ ] **Schritt 1: Upload-API-Route erstellen**

`src/app/api/upload/notes/route.ts`:

```typescript
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "notes");
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Nur JPG, PNG, WebP oder GIF erlaubt" }, { status: 415 });
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Maximale Größe: ${MAX_SIZE_MB} MB` }, { status: 413 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ filename, size: file.size, mimeType: file.type });
}
```

- [ ] **Schritt 2: `notizen/neu/page.tsx` um Bild-Upload erweitern**

In `src/app/app/community/notizen/neu/page.tsx`, die `createNote` Server Action erweitern. Bilder werden nach dem Erstellen der Note in der DB gespeichert.

Ersetze die `createNote`-Action:

```typescript
async function createNote(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const isPublic = formData.get("isPublic") === "on";
  const imageFilenames = (formData.getAll("imageFilename") as string[]).filter(Boolean);

  if (!title || !content) return;

  const note = await prisma.note.create({
    data: {
      title,
      content,
      isPublic,
      authorId: session.userId,
      images: {
        create: imageFilenames.map((filename) => ({
          filename,
          mimeType: filename.endsWith(".png") ? "image/png" : "image/jpeg",
          size: 0,
        })),
      },
    },
  });

  await awardXp(session.userId, "note_geteilt", note.id);

  revalidatePath("/app/community/notizen");
  redirect("/app/community/notizen");
}
```

Füge außerdem ein Datei-Upload-Feld vor dem Submit-Button in das Formular ein. Da Server Actions keine direkten `File`-Uploads aus dem Browser verarbeiten, wird ein zweistufiger Ansatz genutzt: erst Datei per `fetch` an die Upload-Route, dann den Dateinamen als Hidden-Input einfügen.

Ersetze das gesamte Formular-Rendering durch eine Client-Component `NotizenNeuForm` in `src/app/app/community/notizen/neu/NotizenNeuForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";

export function NotizenNeuForm() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ filename: string; preview: string }[]>([]);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/notes", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json() as { filename: string };
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { filename: data.filename, preview }]);
    }
    setUploading(false);
    e.target.value = "";
  }

  return (
    <form method="POST" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Titel *
        </label>
        <input
          id="title" name="title" type="text" required
          placeholder="z. B. pq-Formel — alle Sonderfälle"
          className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Inhalt *
        </label>
        <textarea
          id="content" name="content" required rows={10}
          placeholder="Schreibe hier deine Notiz…"
          className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Bilder */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Bilder (optional, max. 5 MB je Bild)
        </p>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.filename} className="relative">
              <img src={img.preview} alt="Vorschau" className="size-20 border border-border object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((i) => i.filename !== img.filename))}
                className="absolute -right-1 -top-1 grid size-5 place-items-center bg-danger text-white"
              >
                <X className="size-3" />
              </button>
              <input type="hidden" name="imageFilename" value={img.filename} />
            </div>
          ))}
          <label className="grid size-20 cursor-pointer place-items-center border border-dashed border-border bg-surface text-muted-fg hover:border-brand hover:text-brand">
            {uploading ? (
              <span className="text-[10px]">…</span>
            ) : (
              <ImagePlus className="size-5" />
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleImagePick} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input id="isPublic" name="isPublic" type="checkbox" defaultChecked className="size-4 accent-brand" />
        <label htmlFor="isPublic" className="text-sm font-medium">
          Öffentlich teilen (sichtbar für alle Schüler)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="border border-transparent bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/90"
        >
          Notiz veröffentlichen
        </button>
      </div>
    </form>
  );
}
```

Hinweis: Das Formular kann nicht direkt eine Server Action mit Bildern kombinieren, da `File`-Objekte nicht als FormData-Werte an Server Actions übergeben werden können. Die Lösung ist: Bild vorher per fetch uploaden, Dateiname als hidden input einfügen, dann normales Formular-Submit mit der `createNote` Server Action. Dafür muss `NotizenNeuPage` die `NotizenNeuForm` Client Component einbinden und die Server Action als `action` per `next/navigation/form` oder als separates Formular-Wrapper anbieten.

Da die Kombination Server Action + Client Form-Upload komplex ist, empfiehlt sich hier ein einfacherer Ansatz: Den Submit-Button in der Client Component so gestalten, dass er fetch + router.push nutzt.

- [ ] **Schritt 3: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 8: Nachrichten-Berechtigungen (Schüler → nur Lehrer)

**Files:**
- Modify: `src/app/app/nachrichten/neu/page.tsx`
- Modify: `src/app/app/nachrichten/neu/actions.ts`

- [ ] **Schritt 1: Empfänger-Filterung nach Absender-Rolle**

In `src/app/app/nachrichten/neu/page.tsx`, die Prisma-Query ändern:

```typescript
const senderRole = effectiveRole(session);

const allowedRoles: string[] =
  senderRole === "student"
    ? ["teacher"]
    : senderRole === "parent"
    ? ["teacher", "admin"]
    : ["student", "teacher", "parent", "admin"];

const users = await prisma.user.findMany({
  where: {
    schoolId: session.schoolId,
    id: { not: session.userId },
    role: { in: allowedRoles },
  },
  select: { id: true, name: true, role: true },
  orderBy: [{ role: "asc" }, { name: "asc" }],
});
```

Füge den Import `effectiveRole` aus `@/lib/session` hinzu, falls er fehlt.

- [ ] **Schritt 2: Server Action absichern**

In `src/app/app/nachrichten/neu/actions.ts`, in der `createThread`-Action nach der Session-Prüfung:

```typescript
const senderRole = effectiveRole(session);
const allowedRoles: string[] =
  senderRole === "student"
    ? ["teacher"]
    : senderRole === "parent"
    ? ["teacher", "admin"]
    : ["student", "teacher", "parent", "admin"];

const recipient = await prisma.user.findUnique({
  where: { id: recipientId },
  select: { role: true, schoolId: true },
});

if (!recipient || !allowedRoles.includes(recipient.role)) {
  return; // Stille Ablehnung — kein Fehler in der UI nötig
}
if (recipient.schoolId !== session.schoolId) {
  return;
}
```

- [ ] **Schritt 3: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 9: Admin — Klasse erstellen

**Files:**
- Create: `src/app/admin/klassen/neu/page.tsx`
- Create: `src/app/admin/klassen/neu/actions.ts`
- Modify: `src/app/admin/klassen/page.tsx`

- [ ] **Schritt 1: Server Action**

`src/app/admin/klassen/neu/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createClass(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim().toUpperCase() ?? "";
  const grade = parseInt((formData.get("grade") as string | null) ?? "0", 10);

  if (!name || !grade) return;

  await prisma.schoolClass.upsert({
    where: { schoolId_name: { schoolId: session.schoolId, name } },
    update: {},
    create: { name, grade, schoolId: session.schoolId },
  });

  revalidatePath("/admin/klassen");
  redirect("/admin/klassen");
}
```

- [ ] **Schritt 2: Formular-Seite**

`src/app/admin/klassen/neu/page.tsx`:

```typescript
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
          <input
            id="name" name="name" type="text" required
            placeholder="z. B. 9b oder 10A"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
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
```

- [ ] **Schritt 3: "Neue Klasse"-Button in `/admin/klassen/page.tsx` verlinken**

In `src/app/admin/klassen/page.tsx`:

```typescript
// Ersetze:
<Button size="sm">
  <Plus className="size-3.5" />
  Neue Klasse
</Button>

// Mit:
<Link href="/admin/klassen/neu" className={buttonVariants({ size: "sm" })}>
  <Plus className="size-3.5" />
  Neue Klasse
</Link>
```

Füge `buttonVariants` und `Link` zu den Importen hinzu falls sie fehlen.

- [ ] **Schritt 4: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 10: Admin — Lehrer einladen (E-Mail + Token)

**Files:**
- Create: `src/app/admin/nutzer/einladen/page.tsx`
- Create: `src/app/admin/nutzer/einladen/actions.ts`
- Modify: `src/app/admin/nutzer/page.tsx`

- [ ] **Schritt 1: Einladungs-Action**

`src/app/admin/nutzer/einladen/actions.ts`:

```typescript
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email";
import { effectiveRole, getSession } from "@/lib/session";

export async function inviteTeacher(formData: FormData): Promise<{ error?: string } | void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return { error: "Keine Schule zugewiesen" };

  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (!email || !name) return { error: "Name und E-Mail sind Pflicht" };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "Diese E-Mail ist bereits registriert" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Tage

  await prisma.verificationToken.create({
    data: {
      email,
      type: "teacher-invite",
      token,
      expiresAt,
    },
  });

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/onboarding?token=${token}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=teacher`;

  await sendEmail({
    to: email,
    subject: `Einladung zu MasterMind — ${school?.name ?? "Deine Schule"}`,
    html: `
      <p>Hallo ${name},</p>
      <p>Du wurdest eingeladen, MasterMind als Lehrkraft an <strong>${school?.name ?? "deiner Schule"}</strong> zu nutzen.</p>
      <p><a href="${inviteUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block;">Jetzt Account erstellen</a></p>
      <p>Dieser Link ist 7 Tage gültig.</p>
      <p>Wenn du diesen Link nicht angefordert hast, ignoriere diese E-Mail.</p>
    `,
  });

  revalidatePath("/admin/nutzer");
  redirect("/admin/nutzer");
}
```

- [ ] **Schritt 2: Einladungs-Formular-Seite**

`src/app/admin/nutzer/einladen/page.tsx`:

```typescript
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { inviteTeacher } from "./actions";

export const metadata: Metadata = { title: "Lehrer einladen" };

export default async function LehrerEinladenPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/nutzer" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Lehrer einladen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Der Lehrer erhält eine E-Mail mit einem Einladungslink und erstellt seinen Account selbst.
          </p>
        </div>
      </header>

      <form action={inviteTeacher} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Vollständiger Name</label>
          <input
            id="name" name="name" type="text" required
            placeholder="z. B. Dr. Maria Schmidt"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">Schul-E-Mail</label>
          <input
            id="email" name="email" type="email" required
            placeholder="vorname.nachname@schule.de"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="border border-border bg-surface p-4 text-sm text-muted-fg">
          <strong className="font-semibold text-fg">Was passiert nach der Einladung?</strong>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Lehrer erhält E-Mail mit persönlichem Link</li>
            <li>Lehrer klickt Link und legt Passwort fest</li>
            <li>Account ist sofort aktiv — du siehst ihn in der Nutzer-Liste</li>
          </ol>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90">
            Einladung senden
          </button>
          <Link href="/admin/nutzer" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Schritt 3: Onboarding-Route für Token-basierte Einladung erweitern**

In `src/app/onboarding/page.tsx` prüfen, ob `?token=` + `?email=` + `?role=teacher` übergeben wird. Wenn ja, das Token validieren und den Nutzer direkt in das Formular einsetzen. Das Formular registriert den Lehrer und markiert das Token als `consumedAt`.

Prüfe die existierende Datei und ergänze:

```typescript
// Oben im Server Component, nach getSession():
const searchParams = await props.searchParams; // je nach Next.js Version
const inviteToken = searchParams.token as string | undefined;
const inviteEmail = searchParams.email as string | undefined;
const inviteName = searchParams.name as string | undefined;
const inviteRole = searchParams.role as string | undefined;

let tokenData: { email: string; name: string; role: string } | null = null;
if (inviteToken) {
  const tokenRow = await prisma.verificationToken.findUnique({
    where: { token: inviteToken },
    select: { email: true, type: true, expiresAt: true, consumedAt: true },
  });
  if (tokenRow && !tokenRow.consumedAt && tokenRow.expiresAt > new Date() && tokenRow.type === "teacher-invite") {
    tokenData = {
      email: tokenRow.email,
      name: inviteName ?? "",
      role: "teacher",
    };
  }
}
```

Dann im Formular `defaultValue={tokenData?.email}` etc. setzen und beim Speichern des Accounts das Token als consumed markieren:

```typescript
await prisma.verificationToken.update({
  where: { token: inviteToken },
  data: { consumedAt: new Date() },
});
```

- [ ] **Schritt 4: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 11: Stundenzeiten-Konfiguration + Stundenplan-Editor (Admin)

**Files:**
- Create: `src/app/admin/stundenplan/page.tsx`
- Create: `src/app/admin/stundenplan/actions.ts`
- Modify: `src/app/teach/page.tsx` (Stundenzeiten aus DB)
- Modify: `src/app/admin/layout.tsx` (Nav-Link)

- [ ] **Schritt 1: Server Actions für Stundenplan**

`src/app/admin/stundenplan/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function savePeriodConfig(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const ops = [];
  for (let p = 1; p <= 9; p++) {
    const start = (formData.get(`start_${p}`) as string | null)?.trim();
    const end = (formData.get(`end_${p}`) as string | null)?.trim();
    if (!start || !end) continue;
    ops.push(
      prisma.schoolPeriodConfig.upsert({
        where: { schoolId_period: { schoolId: session.schoolId, period: p } },
        update: { startTime: start, endTime: end },
        create: { schoolId: session.schoolId, period: p, startTime: start, endTime: end },
      })
    );
  }
  await prisma.$transaction(ops);
  revalidatePath("/admin/stundenplan");
  revalidatePath("/teach");
}

export async function saveTimetableEntry(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;
  const subjectId = formData.get("subjectId") as string;
  const day = parseInt(formData.get("day") as string, 10);
  const period = parseInt(formData.get("period") as string, 10);
  const room = (formData.get("room") as string | null)?.trim() || null;

  if (!classId || !teacherId || !subjectId || !day || !period) return;

  await prisma.timetableEntry.upsert({
    where: { classId_day_period: { classId, day, period } },
    update: { teacherId, subjectId, room },
    create: { schoolId: session.schoolId, classId, teacherId, subjectId, day, period, room },
  });

  revalidatePath("/admin/stundenplan");
  revalidatePath("/teach");
}

export async function deleteTimetableEntry(entryId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;
  await prisma.timetableEntry.delete({ where: { id: entryId } });
  revalidatePath("/admin/stundenplan");
}
```

- [ ] **Schritt 2: Stundenplan-Admin-Seite**

`src/app/admin/stundenplan/page.tsx`:

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { savePeriodConfig, saveTimetableEntry, deleteTimetableEntry } from "./actions";

export const metadata: Metadata = { title: "Stundenplan · Admin" };

const DEFAULT_TIMES = [
  "08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00",
];
const DEFAULT_END = [
  "08:45", "09:35", "10:35", "11:25", "12:20", "13:10", "14:10", "15:00", "15:45",
];
const DAY_LABELS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default async function AdminstundenplanPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const [classes, teachers, subjects, periodConfigs, timetableEntries] =
    await Promise.all([
      prisma.schoolClass.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { schoolId: session.schoolId, role: "teacher" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, shortName: true, color: true },
      }),
      prisma.schoolPeriodConfig.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { period: "asc" },
      }),
      prisma.timetableEntry.findMany({
        where: { schoolId: session.schoolId },
        include: {
          class: { select: { name: true } },
          teacher: { select: { name: true } },
          subject: { select: { name: true, shortName: true, color: true } },
        },
        orderBy: [{ classId: "asc" }, { day: "asc" }, { period: "asc" }],
      }),
    ]);

  const periodMap = new Map(periodConfigs.map((p) => [p.period, p]));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stundenplan</h1>
      </header>

      {/* Stundenzeiten */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stundenzeiten</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">Gilt für alle Klassen dieser Schule</p>
          </div>
          <Clock className="size-4 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody>
          <form action={savePeriodConfig} className="space-y-3">
            <div className="grid gap-px border border-border bg-border sm:grid-cols-[auto_1fr_1fr]">
              <div className="bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Stunde</div>
              <div className="bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Beginn</div>
              <div className="bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Ende</div>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => {
                const config = periodMap.get(p);
                return (
                  <>
                    <div key={`lbl-${p}`} className="bg-bg px-3 py-2 font-mono text-sm font-bold">{p}.</div>
                    <div key={`start-${p}`} className="bg-bg px-2 py-1.5">
                      <input
                        type="time" name={`start_${p}`}
                        defaultValue={config?.startTime ?? DEFAULT_TIMES[p - 1]}
                        className="w-full bg-transparent font-mono text-sm focus:outline-none"
                      />
                    </div>
                    <div key={`end-${p}`} className="bg-bg px-2 py-1.5">
                      <input
                        type="time" name={`end_${p}`}
                        defaultValue={config?.endTime ?? DEFAULT_END[p - 1]}
                        className="w-full bg-transparent font-mono text-sm focus:outline-none"
                      />
                    </div>
                  </>
                );
              })}
            </div>
            <button type="submit" className="bg-fg px-4 py-2 text-sm font-semibold text-bg hover:bg-fg/90">
              Zeiten speichern
            </button>
          </form>
        </CardBody>
      </Card>

      {/* Stundenplan-Einträge */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stundenplan-Einträge</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">{timetableEntries.length} Einträge gesamt</p>
          </div>
        </CardHeader>
        <CardBody>
          <form action={saveTimetableEntry} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto_auto]">
            <select name="classId" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Klasse…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="teacherId" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Lehrer…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="subjectId" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Fach…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="day" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Tag…</option>
              {DAY_LABELS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
            <select name="period" required className="h-9 border border-border bg-bg px-2 text-sm">
              <option value="">Std…</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>{p}.</option>
              ))}
            </select>
            <input name="room" placeholder="Raum (opt.)" className="h-9 border border-border bg-bg px-2 text-sm w-24" />
            <button type="submit" className="h-9 bg-fg px-3 text-sm font-semibold text-bg hover:bg-fg/90">
              <Plus className="size-3.5" />
            </button>
          </form>

          {timetableEntries.length > 0 && (
            <div className="mt-6 divide-y divide-border border border-border">
              {timetableEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <span
                    className="inline-block size-3 shrink-0"
                    style={{ backgroundColor: e.subject.color }}
                  />
                  <span className="w-8 font-mono font-bold">{e.class.name}</span>
                  <span className="w-20 text-muted-fg">{DAY_LABELS[e.day - 1]}</span>
                  <span className="w-6 font-mono">{e.period}.</span>
                  <span className="flex-1">{e.subject.name}</span>
                  <span className="text-muted-fg">{e.teacher.name}</span>
                  {e.room && <span className="font-mono text-xs text-muted-fg">R. {e.room}</span>}
                  <form action={deleteTimetableEntry.bind(null, e.id)}>
                    <button type="submit" className="text-xs text-muted-fg hover:text-danger">×</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Schritt 3: Admin-Navigation — Stundenplan-Link ergänzen**

In `src/app/admin/layout.tsx`, den Nav-Items-Array (oder wo die Seitenleiste konfiguriert wird) um einen Eintrag für Stundenplan ergänzen.

- [ ] **Schritt 4: Lehrer-Dashboard — Stundenzeiten aus DB**

In `src/app/teach/page.tsx` die Konstante `PERIOD_TIMES` durch eine DB-Abfrage ersetzen:

```typescript
// Ersetze die Konstante:
// const PERIOD_TIMES = ["08:00", ...];

const periodConfigs = await prisma.schoolPeriodConfig.findMany({
  where: { schoolId: session.schoolId ?? "" },
  orderBy: { period: "asc" },
  select: { period: true, startTime: true },
});
const PERIOD_TIMES = Array.from({ length: 9 }, (_, i) => {
  return periodConfigs.find((p) => p.period === i + 1)?.startTime ?? ["08:00","08:50","09:50","10:40","11:35","12:25","13:25","14:15","15:00"][i];
});
```

- [ ] **Schritt 5: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 12: Admin-Nachrichten

**Files:**
- Create: `src/app/admin/nachrichten/page.tsx`
- Create: `src/app/admin/nachrichten/neu/page.tsx`
- Create: `src/app/admin/nachrichten/neu/actions.ts`
- Create: `src/app/admin/nachrichten/[threadId]/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Schritt 1: Admin-Nachrichten-Inbox**

`src/app/admin/nachrichten/page.tsx` — identische Logik wie `src/app/app/nachrichten/page.tsx`, nur mit Admin-Session-Check und Link zu `/admin/nachrichten/...`:

```typescript
import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nachrichten · Admin" };

export default async function AdminNachrichtenPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const participations = await prisma.messageParticipant.findMany({
    where: { userId: session.userId },
    include: {
      thread: {
        include: {
          messages: { orderBy: { sentAt: "desc" }, take: 1, include: { sender: { select: { name: true, id: true } } } },
          participants: { where: { userId: { not: session.userId } }, include: { user: { select: { name: true, role: true } } } },
        },
      },
    },
    orderBy: { thread: { updatedAt: "desc" } },
  });

  const unreadCount = participations.filter((p) => {
    const last = p.thread.messages[0];
    if (!last || last.sender.id === session.userId) return false;
    return !p.lastReadAt || p.lastReadAt < last.sentAt;
  }).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Intern</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Nachrichten</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unreadCount > 0 ? <span className="font-semibold text-fg">{unreadCount} ungelesen</span> : "Alle gelesen"}
            {" · "}{participations.length} Konversationen
          </p>
        </div>
        <Link href="/admin/nachrichten/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neue Nachricht
        </Link>
      </header>

      {participations.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border p-16 text-center">
          <MessageSquare className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Keine Nachrichten</p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border">
          {participations.map((p) => {
            const last = p.thread.messages[0];
            const isUnread = last && last.sender.id !== session.userId && (!p.lastReadAt || p.lastReadAt < last.sentAt);
            const others = p.thread.participants.map((x) => x.user);
            const displayName = others.map((u) => u.name).join(", ") || "Unbekannt";
            return (
              <Link
                key={p.thread.id}
                href={`/admin/nachrichten/${p.thread.id}`}
                className={cn("flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface", isUnread && "bg-brand/[0.03]")}
              >
                <Avatar name={displayName} size="sm" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", isUnread ? "font-bold" : "font-semibold")}>{displayName}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-fg">
                      {last ? last.sentAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "—"}
                    </span>
                  </div>
                  <p className={cn("text-xs", isUnread ? "font-medium text-fg" : "text-muted-fg")}>{p.thread.subject}</p>
                  {last && <p className="mt-0.5 truncate text-xs text-muted-fg">{last.sender.id === session.userId ? "Du: " : ""}{last.content}</p>}
                </div>
                {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Schritt 2: Admin "Neue Nachricht"-Action**

`src/app/admin/nachrichten/neu/actions.ts` — kopiere die existierende Action aus `src/app/app/nachrichten/neu/actions.ts` und ändere die redirect-Pfade auf `/admin/nachrichten/...` und entferne die Rollen-Filterung (Admins können an alle schreiben).

- [ ] **Schritt 3: Admin "Neue Nachricht"-Formular**

`src/app/admin/nachrichten/neu/page.tsx` — analog zu `src/app/app/nachrichten/neu/page.tsx`, ohne Rollenbeschränkung auf Empfänger, mit Admin-Session-Check.

- [ ] **Schritt 4: Admin Thread-Ansicht**

`src/app/admin/nachrichten/[threadId]/page.tsx` — analog zur existierenden `/app/nachrichten/[threadId]/page.tsx`, nur mit Admin-Check und Links auf `/admin/nachrichten`.

- [ ] **Schritt 5: Nav-Link in Admin-Layout**

In `src/app/admin/layout.tsx` Nachrichten-Link im Nav ergänzen.

- [ ] **Schritt 6: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Task 13: Eltern — Neue Nachricht

**Files:**
- Create: `src/app/eltern/nachrichten/neu/page.tsx`
- Create: `src/app/eltern/nachrichten/neu/actions.ts`
- Modify: `src/app/eltern/nachrichten/page.tsx`

- [ ] **Schritt 1: Action — Eltern können nur Lehrern schreiben**

`src/app/eltern/nachrichten/neu/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createParentThread(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "parent") redirect("/login");

  const recipientId = (formData.get("recipientId") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const content = (formData.get("content") as string | null)?.trim() ?? "";

  if (!recipientId || !subject || !content) return;

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { role: true, schoolId: true },
  });

  if (!recipient || !["teacher", "admin"].includes(recipient.role)) return;
  if (recipient.schoolId !== session.schoolId) return;

  const thread = await prisma.messageThread.create({
    data: {
      subject,
      schoolId: session.schoolId!,
      participants: {
        create: [{ userId: session.userId }, { userId: recipientId }],
      },
      messages: {
        create: { senderId: session.userId, content },
      },
    },
  });

  revalidatePath("/eltern/nachrichten");
  redirect(`/eltern/nachrichten/${thread.id}`);
}
```

- [ ] **Schritt 2: "Neue Nachricht"-Seite für Eltern**

`src/app/eltern/nachrichten/neu/page.tsx` — analog zu `/app/nachrichten/neu/page.tsx`, aber Empfänger nur `["teacher", "admin"]`.

- [ ] **Schritt 3: "Neue Nachricht"-Button verlinken**

In `src/app/eltern/nachrichten/page.tsx` den `<Button>` durch `<Link href="/eltern/nachrichten/neu">` ersetzen.

- [ ] **Schritt 4: TypeScript-Check**

```bash
npx tsc --noEmit
```

---

## Abschluss-Checkliste

- [ ] Alle `npx tsc --noEmit` ohne Fehler
- [ ] Prisma Client neu generiert nach Migrations: `npx prisma generate`
- [ ] KI-Tutor-Fix verifiziert (wurde bereits in dieser Session durchgeführt)
- [ ] XP bei Aufgaben-Abgabe funktioniert
- [ ] Notizen können gelöscht werden
- [ ] Bilder-Upload erzeugt Dateien in `public/uploads/notes/`
- [ ] Schüler sehen im Nachrichten-"Neu"-Formular nur Lehrer
- [ ] Admin kann Klassen anlegen
- [ ] Lehrer-Einladungs-E-Mail enthält korrekten Invite-Link
- [ ] Admin hat Stundenplan-Editor und Stundenzeiten-Konfig
- [ ] Admin-Nachrichten-Bereich erreichbar
- [ ] Eltern-"Neue Nachricht" funktioniert
