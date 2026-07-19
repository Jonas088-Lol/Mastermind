/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Megaphone, Monitor, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import {
  createAnnouncement,
  deleteAnnouncement,
  moveAnnouncement,
  toggleAnnouncement,
} from "./actions";

export const metadata: Metadata = { title: "Anzeigetafel-Inhalte · Admin" };

/** 6er-Farbpalette für den Akzent der Ankündigungs-Karten. */
const COLOR_PALETTE: { value: string; label: string }[] = [
  { value: "#3b82f6", label: "Blau" },
  { value: "#22c55e", label: "Grün" },
  { value: "#eab308", label: "Gelb" },
  { value: "#ef4444", label: "Rot" },
  { value: "#8b5cf6", label: "Violett" },
  { value: "#ec4899", label: "Pink" },
];

export default async function AnzeigetafelVerwaltungPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "anzeigetafel-verwaltung")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const announcements = await prisma.boardAnnouncement.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { order: "asc" },
  });

  const activeCount = announcements.filter((a) => a.active).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Anzeigetafel-Inhalte</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {activeCount} von {announcements.length} Ankündigungen aktiv — sie erscheinen als eigene Folie auf der{" "}
          <Link href="/admin/anzeigetafel" className="text-brand underline-offset-2 hover:underline">
            Anzeigetafel
          </Link>
          . Es werden maximal 10 aktive Ankündigungen angezeigt.
        </p>
      </header>

      {/* Neue Ankündigung */}
      <Card>
        <CardHeader>
          <CardTitle>Neue Ankündigung</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={createAnnouncement} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Titel
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  maxLength={120}
                  placeholder="z.B. Sommerfest am Freitag!"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Text (optional)
                </label>
                <textarea
                  name="body"
                  rows={2}
                  maxLength={600}
                  placeholder="Weitere Details zur Ankündigung…"
                  className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Emoji (optional)
                </label>
                <input
                  type="text"
                  name="emoji"
                  maxLength={8}
                  placeholder="🎉"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  Akzentfarbe
                </label>
                <div className="flex h-[38px] flex-wrap items-center gap-3 rounded-xl border border-border bg-bg px-3">
                  {COLOR_PALETTE.map((c, i) => (
                    <label key={c.value} className="flex cursor-pointer items-center" title={c.label}>
                      <input
                        type="radio"
                        name="color"
                        value={c.value}
                        defaultChecked={i === 0}
                        className="peer sr-only"
                      />
                      <span
                        className="size-5 rounded-full border-2 border-transparent transition peer-checked:border-fg peer-checked:ring-2 peer-checked:ring-border"
                        style={{ backgroundColor: c.value }}
                      />
                      <span className="sr-only">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <Button type="submit" variant="secondary">
              <Megaphone className="size-4" />
              Ankündigung erstellen
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Liste */}
      {announcements.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-fg">
              <Monitor className="size-6" />
              Noch keine Ankündigungen — erstelle oben die erste Folie für die Anzeigetafel.
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ankündigungen</CardTitle>
            <span className="text-xs text-muted-fg">Reihenfolge = Anzeige auf der Tafel</span>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {announcements.map((a, idx) => (
                <li key={a.id} className={`flex items-start gap-3 px-5 py-3.5 ${a.active ? "" : "opacity-55"}`}>
                  <span
                    className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: a.color ?? "#3b82f6" }}
                  />
                  {a.emoji && <span className="mt-0.5 text-2xl">{a.emoji}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <Badge variant={a.active ? "success" : "warning"}>
                        {a.active ? "Aktiv" : "Verborgen"}
                      </Badge>
                    </div>
                    {a.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-fg">{a.body}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={moveAnnouncement.bind(null, a.id, "up")}>
                      <Button type="submit" size="sm" variant="ghost" title="Nach oben" disabled={idx === 0}>
                        <ArrowUp className="size-3.5" />
                      </Button>
                    </form>
                    <form action={moveAnnouncement.bind(null, a.id, "down")}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        title="Nach unten"
                        disabled={idx === announcements.length - 1}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </form>
                    <form action={toggleAnnouncement.bind(null, a.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        title={a.active ? "Verbergen" : "Aktivieren"}
                      >
                        {a.active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </Button>
                    </form>
                    <form action={deleteAnnouncement.bind(null, a.id)}>
                      <Button type="submit" size="sm" variant="ghost" title="Löschen">
                        <Trash2 className="size-3.5 text-danger" />
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
