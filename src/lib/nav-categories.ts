/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Kategorien für die linke Navigationsleiste — je Ansicht (Rolle).
 *
 * Die Reihenfolge hier ist der Standard. Nutzer können Reiter per Drag & Drop
 * verschieben, Kategorien ein-/ausklappen und umbenennen; diese Anpassungen
 * liegen in `User.prefs` und werden über `mergeNavLayout()` darübergelegt.
 *
 * Reiter, die in keiner Kategorie stehen (z. B. neu hinzugekommene), landen
 * automatisch in einer Auffang-Kategorie — es geht also nie etwas verloren.
 */

/** Ein Reiter, wie ihn die Layouts liefern (Teilmenge von NavItem). */
export interface NavLike {
  href: string;
  label: string;
}

export interface NavCategoryDef {
  id: string;
  label: string;
  /** hrefs in gewünschter Reihenfolge */
  items: string[];
}

/** Reiter, die immer ganz unten ohne Kategorie stehen (z. B. Suche). */
export const PINNED_BOTTOM_HREFS = ["/search"];

export const NAV_CATEGORIES: Record<string, NavCategoryDef[]> = {
  // ── Schüler ───────────────────────────────────────────────────────────────
  student: [
    {
      id: "uebersicht",
      label: "Übersicht",
      items: [
        "/app",
        "/app/plan",
        "/app/hausaufgaben",
        "/app/noten",
        "/app/fehlzeiten",
        "/app/tagesbelohnung",
        "/app/zeitung",
      ],
    },
    {
      id: "lernen",
      label: "Lernen",
      items: [
        "/app/aufgaben",
        "/app/tutor",
        "/app/uebungen",
        "/app/mastertask",
        "/app/arbeitsblatter",
        "/app/lernen",
        "/app/lernzettel",
        "/app/heft",
        "/app/karteikarten",
        "/app/vokabeln",
      ],
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      items: ["/app/nachrichten", "/app/masterspace"],
    },
    {
      id: "bosse",
      label: "Bosse & Duelle",
      items: ["/app/boss", "/app/duelle", "/app/boss/kompendium", "/app/boss/bestiary"],
    },
    {
      id: "bestenliste",
      label: "Bestenliste",
      items: ["/app/ranking", "/app/hall-of-fame", "/app/rangliste"],
    },
    {
      id: "persoenlich",
      label: "Persönlich",
      items: ["/app/streaks", "/app/quests", "/app/erfolge", "/app/mannschaften", "/app/community"],
    },
    {
      id: "shop",
      label: "Shop",
      items: ["/app/shop", "/app/inventar", "/app/titel", "/app/saison", "/app/coins"],
    },
    {
      id: "masteroffice",
      label: "MasterOffice",
      items: ["/app/dokumente", "/app/tabellen", "/app/praesentationen", "/app/drive", "/app/folder", "/app/vault"],
    },
  ],

  // ── Lehrkraft ─────────────────────────────────────────────────────────────
  teacher: [
    {
      id: "uebersicht",
      label: "Übersicht",
      items: [
        "/teach",
        "/teach/plan",
        "/teach/klassen",
        "/teach/noten",
        "/teach/kompetenzen",
        "/teach/statistiken",
      ],
    },
    {
      id: "unterricht",
      label: "Unterricht",
      items: [
        "/teach/generator",
        "/teach/arbeitsblatter",
        "/teach/erstellen",
        "/teach/aufgaben",
        "/teach/hausaufgaben",
        "/teach/uebungen",
        "/teach/mastertask",
        "/teach/lernpfade",
        "/teach/boss",
        "/teach/korrektur",
        "/teach/vorlagen",
        "/teach/arbeitsblatter/templates",
      ],
    },
    {
      id: "organisation",
      label: "Organisation",
      items: [
        "/teach/klassenbuch",
        "/teach/kalender",
        "/teach/sitzplan",
        "/teach/abwesenheit",
        "/teach/notenschluessel",
        "/teach/ressourcen",
      ],
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      items: [
        "/teach/nachrichten",
        "/teach/masterspace",
        "/teach/broadcast",
        "/teach/elterngespraeche",
        "/teach/elternsprechtag",
        "/teach/elternbrief",
        "/teach/serienbrief",
      ],
    },
    {
      id: "masteroffice",
      label: "MasterOffice",
      items: ["/teach/office/dokumente", "/teach/office/tabellen", "/teach/office/praesentationen", "/teach/office/drive", "/teach/office/folder", "/teach/office/vault"],
    },
  ],

  // ── Schulleitung ──────────────────────────────────────────────────────────
  rector: [
    {
      id: "uebersicht",
      label: "Übersicht",
      items: ["/rektor", "/rektor/statistiken", "/admin/berichte", "/rektor/evaluation"],
    },
    {
      id: "schule",
      label: "Schule & Personal",
      items: ["/rektor/personal", "/rektor/schuljahr", "/rektor/mannschaften"],
    },
    {
      id: "noten",
      label: "Noten & Leistung",
      items: ["/admin/notenspiegel", "/admin/notenschluessel"],
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      items: ["/rektor/broadcast"],
    },
    {
      id: "verwaltung",
      label: "Verwaltung",
      items: [
        "/admin/branding",
        "/admin/lizenz",
        "/admin/einstellungen",
        "/admin/integrationen",
        "/admin/gamification",
      ],
    },
    {
      id: "sicherheit",
      label: "Sicherheit & Recht",
      items: [
        "/admin/rechte",
        "/admin/sicherheit",
        "/admin/audit",
        "/admin/einwilligungen",
      ],
    },
    {
      id: "masteroffice",
      label: "MasterOffice",
      items: ["/rektor/office/dokumente", "/rektor/office/tabellen", "/rektor/office/praesentationen", "/rektor/office/drive", "/rektor/office/folder", "/rektor/office/vault"],
    },
  ],

  // ── Sekretariat ───────────────────────────────────────────────────────────
  secretary: [
    {
      id: "uebersicht",
      label: "Übersicht",
      items: ["/sekretariat"],
    },
    {
      id: "schueler",
      label: "Schüler & Klassen",
      items: [
        "/sekretariat/schueler",
        "/sekretariat/klassen",
        "/sekretariat/neuanmeldung",
        "/admin/nutzer",
        "/admin/klassen",
        "/admin/import",
      ],
    },
    {
      id: "anwesenheit",
      label: "Anwesenheit",
      items: ["/sekretariat/fehlzeiten", "/sekretariat/atteste", "/admin/fehlzeiten"],
    },
    {
      id: "unterricht",
      label: "Unterricht & Pläne",
      items: [
        "/admin/stundenplan",
        "/admin/vertretungsplan",
        "/admin/faecher",
        "/admin/schulkalender",
      ],
    },
    {
      id: "dokumente",
      label: "Dokumente & Ressourcen",
      items: ["/sekretariat/zeugnisse", "/admin/abgaben", "/admin/ressourcen"],
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      items: [
        "/admin/nachrichten",
        "/admin/postfach",
        "/admin/elternverwaltung",
        "/admin/elternsprechtag",
      ],
    },
    {
      id: "anzeigetafel",
      label: "Anzeigetafel",
      items: ["/sekretariat/anzeigetafel", "/admin/anzeigetafel-verwaltung"],
    },
    {
      id: "masteroffice",
      label: "MasterOffice",
      items: ["/sekretariat/office/dokumente", "/sekretariat/office/tabellen", "/sekretariat/office/praesentationen", "/sekretariat/office/drive", "/sekretariat/office/folder", "/sekretariat/office/vault"],
    },
  ],

  // ── Eltern ────────────────────────────────────────────────────────────────
  parent: [
    {
      id: "uebersicht",
      label: "Übersicht",
      items: [
        "/eltern",
        "/eltern/stundenplan",
        "/eltern/kalender",
        "/eltern/abwesenheit",
        "/eltern/fehlzeiten",
        "/eltern/belohnungen",
      ],
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      items: ["/eltern/nachrichten", "/eltern/elternsprechtag"],
    },
    {
      id: "unterricht",
      label: "Unterricht",
      items: [
        "/eltern/hausaufgaben",
        "/eltern/aufgaben",
        "/eltern/uebungen",
        "/eltern/arbeitsblatter",
        "/eltern/einwilligungen",
      ],
    },
    {
      id: "lernentwicklung",
      label: "Lernentwicklung",
      items: [
        "/eltern/lernfortschritt",
        "/eltern/noten",
        "/eltern/leistungsentwicklung",
        "/eltern/bericht",
      ],
    },
  ],
};

// ── Nutzer-Anpassungen ───────────────────────────────────────────────────────

/** In `User.prefs.nav[role]` gespeicherte Anpassungen. */
export interface NavOverride {
  /** Kategorie-Reihenfolge (IDs). */
  order?: string[];
  /** Umbenannte Kategorien: { categoryId: neuerName }. */
  names?: Record<string, string>;
  /** Zugeklappte Kategorien (IDs). */
  collapsed?: string[];
  /** Reiter-Reihenfolge je Kategorie: { categoryId: [href, …] }. */
  items?: Record<string, string[]>;
}

export interface ResolvedCategory {
  id: string;
  label: string;
  collapsed: boolean;
  items: NavLike[];
}

export interface ResolvedNav<T extends NavLike> {
  categories: (Omit<ResolvedCategory, "items"> & { items: T[] })[];
  /** Immer unten, ohne Kategorie (z. B. Suche). */
  pinned: T[];
}

/**
 * Führt Standard-Kategorien, die tatsächlich vorhandenen Reiter und die
 * Nutzer-Anpassungen zusammen.
 *
 * Robust gegen Änderungen: Reiter, die es nicht (mehr) gibt, werden ignoriert;
 * neue Reiter ohne Kategorie landen in "Weitere", gehen also nie verloren.
 */
export function mergeNavLayout<T extends NavLike>(
  role: string,
  allItems: T[],
  override?: NavOverride | null,
): ResolvedNav<T> {
  const defs = NAV_CATEGORIES[role] ?? [];
  const byHref = new Map(allItems.map((i) => [i.href, i]));

  // Angeheftete Reiter (Suche) vorab herausnehmen.
  const pinned = PINNED_BOTTOM_HREFS.map((h) => byHref.get(h)).filter((i): i is T => !!i);
  for (const h of PINNED_BOTTOM_HREFS) byHref.delete(h);

  const used = new Set<string>();
  const catOrder = override?.order?.length
    ? // Gespeicherte Reihenfolge zuerst, danach neue Kategorien aus den Defaults.
      [...override.order, ...defs.map((d) => d.id).filter((id) => !override.order!.includes(id))]
    : defs.map((d) => d.id);

  const categories = catOrder
    .map((id) => {
      const def = defs.find((d) => d.id === id);
      if (!def) return null;

      const savedItems = override?.items?.[id];
      // Gespeicherte Reihenfolge, danach neue Default-Einträge dieser Kategorie.
      const hrefs = savedItems?.length
        ? [...savedItems, ...def.items.filter((h) => !savedItems.includes(h))]
        : def.items;

      const items = hrefs
        .map((h) => {
          const item = byHref.get(h);
          if (!item || used.has(h)) return null;
          used.add(h);
          return item;
        })
        .filter((i): i is T => !!i);

      return {
        id,
        label: override?.names?.[id] ?? def.label,
        collapsed: override?.collapsed?.includes(id) ?? false,
        items,
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  // Reiter, die in keiner Kategorie stehen → Auffang-Kategorie.
  const leftovers = allItems.filter(
    (i) => !used.has(i.href) && !PINNED_BOTTOM_HREFS.includes(i.href),
  );
  if (leftovers.length > 0) {
    const savedItems = override?.items?.weitere;
    const ordered = savedItems?.length
      ? [
          ...savedItems.map((h) => leftovers.find((i) => i.href === h)).filter((i): i is T => !!i),
          ...leftovers.filter((i) => !savedItems.includes(i.href)),
        ]
      : leftovers;
    categories.push({
      id: "weitere",
      label: override?.names?.weitere ?? "Weitere",
      collapsed: override?.collapsed?.includes("weitere") ?? false,
      items: ordered,
    });
  }

  return { categories: categories.filter((c) => c.items.length > 0), pinned };
}
