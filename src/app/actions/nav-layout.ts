/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { getSession, effectiveRole } from "@/lib/session";
import { saveNavOverride } from "@/lib/nav-prefs";
import type { NavOverride } from "@/lib/nav-categories";

/**
 * Speichert die persönliche Navigations-Anordnung (Reihenfolge, Kategorie-Namen,
 * ein-/ausgeklappte Kategorien) für die aktuelle Ansicht des Nutzers.
 *
 * Bewusst tolerant: ungültige Felder werden verworfen statt zu werfen — die
 * Navigation soll nie wegen einer kaputten Anpassung kaputtgehen.
 */
export async function saveNavLayout(override: NavOverride): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const role = effectiveRole(session);

  // Whitelist + Längenbegrenzung (kein unbegrenzter Payload in der DB).
  const clean: NavOverride = {};
  if (Array.isArray(override.order)) {
    clean.order = override.order.filter((s) => typeof s === "string").slice(0, 50);
  }
  if (Array.isArray(override.collapsed)) {
    clean.collapsed = override.collapsed.filter((s) => typeof s === "string").slice(0, 50);
  }
  if (override.names && typeof override.names === "object") {
    clean.names = Object.fromEntries(
      Object.entries(override.names)
        .filter(([, v]) => typeof v === "string")
        .slice(0, 50)
        .map(([k, v]) => [k, String(v).trim().slice(0, 40)]),
    );
  }
  if (override.items && typeof override.items === "object") {
    clean.items = Object.fromEntries(
      Object.entries(override.items)
        .slice(0, 50)
        .map(([k, v]) => [
          k,
          Array.isArray(v) ? v.filter((s) => typeof s === "string").slice(0, 100) : [],
        ]),
    );
  }

  await saveNavOverride(session.userId, role, clean);
}
