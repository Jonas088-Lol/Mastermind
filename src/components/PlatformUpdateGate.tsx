/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Server-Komponente: lädt das aktuelle Plattform-Update (falls vorhanden) und
// mountet das Client-Popup. Wird in jedem Rollen-Layout eingebunden.
import { getCurrentPlatformUpdate } from "@/lib/platform-update";
import { PlatformUpdatePopup } from "@/components/PlatformUpdatePopup";

export async function PlatformUpdateGate() {
  const update = await getCurrentPlatformUpdate().catch(() => null);
  if (!update) return null;
  return (
    <PlatformUpdatePopup
      id={update.id}
      title={update.title}
      body={update.body}
      publishedAt={update.publishedAt}
    />
  );
}
