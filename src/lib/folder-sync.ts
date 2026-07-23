/* Copyright 2026 Elian Schock, Jonas Schwenk */

/**
 * MasterFolder — Sync- und Konfliktlogik (plattformunabhängig, rein funktional).
 *
 * Grundregeln (siehe Spezifikation):
 * - Offline-First: Clients sammeln Änderungen und schicken sie beim Sync.
 * - Konflikt: neuere Version gewinnt; die ältere bleibt als Konfliktkopie
 *   erhalten — es geht NICHTS verloren.
 * - Delta: es werden nur geänderte Einträge übertragen, nicht der ganze Ordner.
 *
 * Diese Datei enthält keine DB-/IO-Zugriffe, damit sie testbar bleibt und auf
 * Server (Next.js) wie Client (Browser/Flutter/Electron) identisch rechnet.
 */

export interface FolderEntry {
  /** Pfad = eindeutiger Schlüssel innerhalb des Nutzer-Ordners, z. B. "Notizen/Mathe.txt". */
  path: string;
  name: string;
  kind: "note" | "file" | "folder";
  content: string;      // Textinhalt bzw. Referenz auf ein Drive-Blob
  mime: string;
  size: number;
  version: number;      // serverseitig monoton steigend
  updatedAt: string;    // ISO
  deviceId: string;     // wer zuletzt geschrieben hat
  deleted: boolean;
}

/** Eine vom Client mitgebrachte Änderung. */
export interface FolderChange {
  path: string;
  name: string;
  kind: "note" | "file" | "folder";
  content: string;
  mime: string;
  size: number;
  /** Version, die der Client zuletzt vom Server kannte (0 = neu angelegt). */
  baseVersion: number;
  updatedAt: string;    // Zeitpunkt der lokalen Änderung (ISO)
  deviceId: string;
  deleted: boolean;
}

/** Name für eine Konfliktkopie: "Datei (Konflikt, Gerät, 2026-07-23).txt". */
export function conflictName(entry: FolderEntry, dateIso: string): { name: string; path: string } {
  const date = dateIso.slice(0, 10);
  const tag = ` (Konflikt, ${entry.deviceId}, ${date})`;
  const dot = entry.name.lastIndexOf(".");
  const name =
    dot > 0 ? entry.name.slice(0, dot) + tag + entry.name.slice(dot) : entry.name + tag;
  const slash = entry.path.lastIndexOf("/");
  const dir = slash >= 0 ? entry.path.slice(0, slash + 1) : "";
  return { name, path: `${dir}${name}` };
}

export interface ResolveResult {
  /** Der neue Server-Stand für diesen Pfad. */
  winner: FolderEntry;
  /** Falls ein Konflikt auftrat: die unterlegene Version als Kopie behalten. */
  conflictCopy?: FolderEntry;
}

/**
 * Eine einzelne Änderung gegen den aktuellen Serverstand auflösen.
 * `nowIso` wird übergeben (kein `Date.now()` hier) — testbar & deterministisch.
 */
export function resolveEntry(
  server: FolderEntry | null,
  change: FolderChange,
  nowIso: string,
): ResolveResult {
  const asEntry = (version: number): FolderEntry => ({
    path: change.path,
    name: change.name,
    kind: change.kind,
    content: change.content,
    mime: change.mime,
    size: change.size,
    version,
    updatedAt: change.updatedAt,
    deviceId: change.deviceId,
    deleted: change.deleted,
  });

  // Neu angelegt oder Server kennt den Pfad (noch) nicht.
  if (!server) return { winner: asEntry(1) };

  // Kein Konflikt: Client baute auf dem aktuellen Serverstand auf.
  if (change.baseVersion === server.version) {
    return { winner: asEntry(server.version + 1) };
  }

  // Konflikt: Server wurde seit dem Base-Stand des Clients geändert.
  // Neuere Änderung (nach updatedAt) gewinnt; die ältere wird als Kopie behalten.
  const clientNewer = change.updatedAt >= server.updatedAt;

  if (clientNewer) {
    // Client gewinnt → Serverstand wird zur Konfliktkopie.
    const copyMeta = conflictName(server, nowIso);
    return {
      winner: asEntry(server.version + 1),
      conflictCopy: {
        ...server,
        name: copyMeta.name,
        path: copyMeta.path,
        version: 1,
        updatedAt: nowIso,
      },
    };
  }

  // Server gewinnt → Serverstand bleibt, Client-Änderung wird als Kopie behalten.
  const copyMeta = conflictName(asEntry(0), nowIso);
  return {
    winner: server,
    conflictCopy: {
      ...asEntry(1),
      name: copyMeta.name,
      path: copyMeta.path,
      updatedAt: nowIso,
    },
  };
}

/** Einträge, die der Client seit `since` (Version) noch nicht kennt (Delta-Pull). */
export function entriesSince(server: FolderEntry[], since: number): FolderEntry[] {
  return server.filter((e) => e.version > since);
}
