/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Plattform-Updates: Ankündigungen der Plattform-Admins an alle Nutzer.
// Gespeichert als JSON im GlobalSetting "PLATFORM_UPDATE" — bewusst nur das
// jeweils aktuellste Update, kein eigenes Modell/Migration nötig.
import "server-only";
import { getSetting } from "@/lib/settings";

export interface PlatformUpdate {
  /** Eindeutig je Veröffentlichung — Grundlage fürs „schon gesehen" im Client. */
  id: string;
  title: string;
  body: string;
  publishedAt: string; // ISO
}

export async function getCurrentPlatformUpdate(): Promise<PlatformUpdate | null> {
  const raw = await getSetting("PLATFORM_UPDATE");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlatformUpdate;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}
