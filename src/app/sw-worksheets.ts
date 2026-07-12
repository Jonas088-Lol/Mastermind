/* Copyright 2026 Elian Schock, Jonas Schwenk */
export function registerWorksheetOfflineSupport(worksheetId: string, data: unknown): void {
  // Store worksheet data in IndexedDB for offline access
  if (typeof window === "undefined") return;
  const openReq = indexedDB.open("mastermind-worksheets", 1);
  openReq.onupgradeneeded = (e) => {
    const db = (e.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains("worksheets"))
      db.createObjectStore("worksheets", { keyPath: "id" });
    if (!db.objectStoreNames.contains("answer-queue"))
      db.createObjectStore("answer-queue", { keyPath: "id", autoIncrement: true });
  };
  openReq.onsuccess = (e) => {
    const db = (e.target as IDBOpenDBRequest).result;
    const tx = db.transaction("worksheets", "readwrite");
    tx.objectStore("worksheets").put({ id: worksheetId, data, cachedAt: Date.now() });
  };
}

export function queueOfflineAnswers(
  assignmentId: string,
  answers: Record<string, string>,
  timeTakenSec: number
): void {
  // Queue answers for sync when online
  if (typeof window === "undefined") return;
  const openReq = indexedDB.open("mastermind-worksheets", 1);
  openReq.onsuccess = (e) => {
    const db = (e.target as IDBOpenDBRequest).result;
    const tx = db.transaction("answer-queue", "readwrite");
    tx
      .objectStore("answer-queue")
      .add({ assignmentId, answers, timeTakenSec, queuedAt: Date.now() });
  };
}

export async function syncOfflineQueue(): Promise<number> {
  // Try to submit all queued answers, returns count synced
  if (typeof window === "undefined" || !navigator.onLine) return 0;
  return new Promise((resolve) => {
    const openReq = indexedDB.open("mastermind-worksheets", 1);
    openReq.onsuccess = async (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction("answer-queue", "readwrite");
      const store = tx.objectStore("answer-queue");
      const allReq = store.getAll();
      allReq.onsuccess = async () => {
        const items = allReq.result as Array<{
          id: number;
          assignmentId: string;
          answers: Record<string, string>;
          timeTakenSec: number;
        }>;
        let synced = 0;
        for (const item of items) {
          try {
            const res = await fetch("/api/worksheets/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assignmentId: item.assignmentId,
                answers: item.answers,
                timeTakenSec: item.timeTakenSec,
              }),
            });
            if (res.ok) {
              const delTx = db.transaction("answer-queue", "readwrite");
              delTx.objectStore("answer-queue").delete(item.id);
              synced++;
            }
          } catch {
            // Network error — leave item in queue for next sync attempt
          }
        }
        resolve(synced);
      };
    };
  });
}
