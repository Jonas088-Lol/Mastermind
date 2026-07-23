/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Folder, Plus, Trash2, Cloud, CloudOff, RefreshCw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderChange, FolderEntry } from "@/lib/folder-sync";

/**
 * MasterFolder (Browser-Client, Offline-First v1).
 *
 * Einträge und ausstehende Änderungen liegen in localStorage (Offline-Cache +
 * Änderungs-Queue). Beim Laden und nach jeder Bearbeitung wird — sofern online —
 * mit /api/vault/folder/sync abgeglichen. Konflikte löst der Server
 * (neuere gewinnt, ältere als Kopie). Flutter (Hive) und Electron (Dateisystem)
 * nutzen später denselben Sync-Endpunkt.
 */

const LS_ENTRIES = "mfolder.entries";
const LS_QUEUE = "mfolder.queue";
const LS_SINCE = "mfolder.since";
const LS_DEVICE = "mfolder.device";

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* Speicher voll o. Ä. */ }
}
function deviceId(): string {
  let id = loadLS<string>(LS_DEVICE, "");
  if (!id) { id = "web-" + Math.random().toString(36).slice(2, 8); saveLS(LS_DEVICE, id); }
  return id;
}

export function MasterFolderClient() {
  const [entries, setEntries] = useState<FolderEntry[]>(() => loadLS(LS_ENTRIES, []));
  const [queue, setQueue] = useState<FolderChange[]>(() => loadLS(LS_QUEUE, []));
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const sinceRef = useRef<number>(loadLS(LS_SINCE, 0));

  useEffect(() => { saveLS(LS_ENTRIES, entries); }, [entries]);
  useEffect(() => { saveLS(LS_QUEUE, queue); }, [queue]);

  const notes = entries.filter((e) => !e.deleted && e.kind === "note").sort((a, b) => a.name.localeCompare(b.name, "de"));
  const open = entries.find((e) => e.path === openPath) ?? null;
  const pendingPaths = new Set(queue.map((c) => c.path));

  const sync = useCallback(async (changes: FolderChange[]) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/vault/folder/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ since: sinceRef.current, changes }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { entries: FolderEntry[]; maxVersion: number };
      setOnline(true);
      // Server-Einträge in den lokalen Stand einmischen (Server ist Wahrheit).
      setEntries((prev) => {
        const map = new Map(prev.map((e) => [e.path, e]));
        for (const e of data.entries) map.set(e.path, e);
        return [...map.values()];
      });
      if (data.maxVersion > sinceRef.current) {
        sinceRef.current = data.maxVersion;
        saveLS(LS_SINCE, data.maxVersion);
      }
      setQueue([]); // erfolgreich übertragen
    } catch {
      setOnline(false); // offline: Queue bleibt erhalten und wird später gesendet
    } finally {
      setSyncing(false);
    }
  }, []);

  // Initial-Sync + ausstehende Queue senden.
  useEffect(() => { void sync(queue); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Bei Wiederverbindung ausstehende Änderungen nachreichen.
  useEffect(() => {
    function goOnline() { setOnline(true); void sync(loadLS<FolderChange[]>(LS_QUEUE, [])); }
    function goOffline() { setOnline(false); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [sync]);

  function queueChange(entry: FolderEntry) {
    const change: FolderChange = {
      path: entry.path, name: entry.name, kind: entry.kind, content: entry.content,
      mime: entry.mime, size: entry.size, baseVersion: entry.version,
      updatedAt: new Date().toISOString(), deviceId: deviceId(), deleted: entry.deleted,
    };
    const nextQueue = [...queue.filter((c) => c.path !== entry.path), change];
    setQueue(nextQueue);
    void sync(nextQueue);
  }

  function createNote() {
    const base = "Neue Notiz";
    let name = `${base}.txt`;
    let n = 2;
    while (entries.some((e) => e.path === `Notizen/${name}` && !e.deleted)) name = `${base} ${n++}.txt`;
    const entry: FolderEntry = {
      path: `Notizen/${name}`, name, kind: "note", content: "", mime: "text/plain",
      size: 0, version: 0, updatedAt: new Date().toISOString(), deviceId: deviceId(), deleted: false,
    };
    setEntries((prev) => [...prev, entry]);
    setOpenPath(entry.path);
    setDraft("");
    queueChange(entry);
  }

  function saveDraft() {
    if (!open) return;
    const updated: FolderEntry = { ...open, content: draft, size: draft.length, updatedAt: new Date().toISOString() };
    setEntries((prev) => prev.map((e) => (e.path === open.path ? updated : e)));
    queueChange(updated);
  }

  function removeNote(entry: FolderEntry) {
    const updated: FolderEntry = { ...entry, deleted: true, updatedAt: new Date().toISOString() };
    setEntries((prev) => prev.map((e) => (e.path === entry.path ? updated : e)));
    if (openPath === entry.path) setOpenPath(null);
    queueChange(updated);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">MasterOffice</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
            <Folder className="size-8 text-brand" strokeWidth={1.5} />
            MasterFolder
          </h1>
          <p className="mt-1 text-sm text-muted-fg">Dein Ordner — auch offline nutzbar, synchronisiert automatisch.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            online ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
            {syncing ? "Synchronisiert…" : online ? "Synchron" : "Offline"}
            {queue.length > 0 && ` · ${queue.length} ausstehend`}
          </span>
          <button type="button" onClick={createNote}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90">
            <Plus className="size-4" /> Neue Notiz
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Liste */}
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {notes.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-fg">Noch keine Notizen.</p>
          ) : notes.map((e) => (
            <button key={e.path} type="button"
              onClick={() => { setOpenPath(e.path); setDraft(e.content); }}
              className={cn("flex items-center gap-2 p-3 text-left transition-colors hover:bg-surface first:rounded-t-2xl",
                openPath === e.path && "bg-surface")}>
              <FileText className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.name.replace(/\.txt$/, "")}</span>
              {pendingPaths.has(e.path) && <span className="size-1.5 shrink-0 rounded-full bg-warning" title="nicht synchronisiert" />}
              <span role="button" tabIndex={0}
                onClick={(ev) => { ev.stopPropagation(); removeNote(e); }}
                onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); removeNote(e); } }}
                className="shrink-0 rounded p-1 text-muted-fg hover:text-danger">
                <Trash2 className="size-3.5" />
              </span>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="rounded-2xl border border-border bg-bg p-4">
          {!open ? (
            <p className="grid h-full place-items-center py-16 text-sm text-muted-fg">Notiz auswählen oder neu anlegen.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                value={open.name.replace(/\.txt$/, "")}
                onChange={(e) => {
                  const name = e.target.value.slice(0, 120) + ".txt";
                  const updated = { ...open, name };
                  setEntries((prev) => prev.map((x) => (x.path === open.path ? updated : x)));
                }}
                onBlur={() => open && queueChange(open)}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
              />
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveDraft}
                rows={16}
                placeholder="Schreib deine Notiz…"
                className="resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand"
              />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-fg">
                  {pendingPaths.has(open.path)
                    ? <><RefreshCw className="size-3" /> nicht gespeichert</>
                    : <><Cloud className="size-3" /> gesichert</>}
                </span>
                <button type="button" onClick={saveDraft}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface">
                  Speichern
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
