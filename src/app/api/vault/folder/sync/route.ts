/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { resolveEntry, entriesSince, type FolderChange, type FolderEntry } from "@/lib/folder-sync";

/**
 * MasterFolder-Sync: Delta-Push/Pull mit Konfliktauflösung.
 *
 * Ablauf: Der Client schickt seine lokalen Änderungen (`changes`) und die
 * höchste Version, die er kennt (`since`). Der Server wendet die Änderungen mit
 * der Konfliktregel an (neuere gewinnt, ältere als Kopie) und liefert alle
 * Einträge zurück, die der Client noch nicht hat.
 *
 * DSGVO: ausschließlich der eigene Ordner (userId aus der Session).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.userId;

  let payload: { since?: number; changes?: FolderChange[] };
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  const since = Number.isInteger(payload.since) ? (payload.since as number) : 0;
  const changes = Array.isArray(payload.changes) ? payload.changes.slice(0, 500) : [];

  const nowIso = new Date().toISOString();

  // Änderungen der Reihe nach: jede baut auf dem aktuellen Serverstand auf.
  for (const change of changes) {
    if (typeof change?.path !== "string" || !change.path) continue;
    const path = change.path.slice(0, 400);

    const current = await prisma.masterFolderEntry.findUnique({
      where: { userId_path: { userId, path } },
    });
    const server: FolderEntry | null = current
      ? {
          path: current.path, name: current.name, kind: current.kind as FolderEntry["kind"],
          content: current.content, mime: current.mime, size: current.size,
          version: current.version, updatedAt: current.updatedAt.toISOString(),
          deviceId: current.deviceId, deleted: current.deleted,
        }
      : null;

    const safeChange: FolderChange = {
      path,
      name: String(change.name ?? path).slice(0, 200),
      kind: (["note", "file", "folder"].includes(change.kind) ? change.kind : "note") as FolderChange["kind"],
      content: String(change.content ?? "").slice(0, 2_000_000),
      mime: String(change.mime ?? "text/plain").slice(0, 120),
      size: Number.isFinite(change.size) ? Number(change.size) : 0,
      baseVersion: Number.isInteger(change.baseVersion) ? change.baseVersion : 0,
      updatedAt: typeof change.updatedAt === "string" ? change.updatedAt : nowIso,
      deviceId: String(change.deviceId ?? "").slice(0, 80),
      deleted: Boolean(change.deleted),
    };

    const { winner, conflictCopy } = resolveEntry(server, safeChange, nowIso);

    // Konfliktkopie zuerst anlegen (verliert nie den Datenstand).
    if (conflictCopy) {
      await prisma.masterFolderEntry.upsert({
        where: { userId_path: { userId, path: conflictCopy.path } },
        create: {
          userId, path: conflictCopy.path, name: conflictCopy.name, kind: conflictCopy.kind,
          content: conflictCopy.content, mime: conflictCopy.mime, size: conflictCopy.size,
          version: 1, deviceId: conflictCopy.deviceId, deleted: conflictCopy.deleted,
        },
        update: {}, // existiert die Kopie schon, nicht überschreiben
      });
    }

    // Gewinner schreiben (nur, wenn er tatsächlich vom Client kommt).
    if (!server || winner.version !== server.version) {
      await prisma.masterFolderEntry.upsert({
        where: { userId_path: { userId, path } },
        create: {
          userId, path, name: winner.name, kind: winner.kind, content: winner.content,
          mime: winner.mime, size: winner.size, version: winner.version,
          deviceId: winner.deviceId, deleted: winner.deleted,
        },
        update: {
          name: winner.name, kind: winner.kind, content: winner.content, mime: winner.mime,
          size: winner.size, version: winner.version, deviceId: winner.deviceId,
          deleted: winner.deleted,
        },
      });
    }
  }

  // Delta-Pull: alles, was neuer als der Client-Stand ist.
  const all = await prisma.masterFolderEntry.findMany({
    where: { userId },
    orderBy: { version: "asc" },
  });
  const mapped: FolderEntry[] = all.map((e) => ({
    path: e.path, name: e.name, kind: e.kind as FolderEntry["kind"], content: e.content,
    mime: e.mime, size: e.size, version: e.version, updatedAt: e.updatedAt.toISOString(),
    deviceId: e.deviceId, deleted: e.deleted,
  }));
  const delta = entriesSince(mapped, since);
  const maxVersion = mapped.reduce((m, e) => Math.max(m, e.version), 0);

  return Response.json({ entries: delta, maxVersion, serverTime: nowIso });
}
