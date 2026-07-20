/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { NavItem } from "@/components/app/Sidebar";

/**
 * Navigation für Schulleitung und Sekretariat.
 *
 * Seit der Auflösung des „Schul-Admins" gehören die Verwaltungsbereiche
 * (/admin/…) zu diesen beiden Rollen. Damit die Leiste in der eigenen Ansicht
 * (/rektor, /sekretariat) und im Verwaltungsbereich identisch aussieht, wird
 * hier **eine** gemeinsame Liste je Rolle definiert und in beiden Layouts genutzt.
 */

export const RECTOR_NAV: NavItem[] = [
  // Eigene Schulleitungs-Seiten
  { href: "/rektor",               label: "Dashboard",          icon: "home", exact: true },
  { href: "/rektor/statistiken",   label: "Statistiken",        icon: "barChart3" },
  { href: "/rektor/personal",      label: "Personal",           icon: "users" },
  { href: "/rektor/schuljahr",     label: "Schuljahresplanung", icon: "calendarDays" },
  { href: "/rektor/evaluation",    label: "Evaluation",         icon: "lineChart" },
  { href: "/rektor/mannschaften",  label: "Mannschaften",       icon: "shield" },
  { href: "/rektor/broadcast",     label: "Broadcast",          icon: "megaphone" },
  // Verwaltungsbereiche der Schulleitung
  { href: "/admin/berichte",        label: "Berichte",        icon: "barChart3" },
  { href: "/admin/notenspiegel",    label: "Notenspiegel",    icon: "barChart3" },
  { href: "/admin/notenschluessel", label: "Notenschlüssel",  icon: "calculator" },
  { href: "/admin/branding",        label: "Branding",        icon: "sparkles" },
  { href: "/admin/lizenz",          label: "Lizenz",          icon: "award" },
  { href: "/admin/einstellungen",   label: "Einstellungen",   icon: "settings" },
  { href: "/admin/integrationen",   label: "Integrationen",   icon: "layers" },
  { href: "/admin/gamification",    label: "Gamification",    icon: "zap" },
  { href: "/admin/rechte",          label: "Rechte",          icon: "userCheck" },
  { href: "/admin/sicherheit",      label: "Sicherheit",      icon: "shield" },
  { href: "/admin/audit",           label: "Audit-Log",       icon: "lineChart" },
  { href: "/admin/einwilligungen",  label: "Einwilligungen",  icon: "fileCheck" },
  { href: "/search",                label: "Suche",           icon: "search" },
];

export const SECRETARY_NAV: NavItem[] = [
  // Eigene Sekretariats-Seiten
  { href: "/sekretariat",              label: "Dashboard",     icon: "home", exact: true },
  { href: "/sekretariat/schueler",     label: "Schüler",       icon: "users" },
  { href: "/sekretariat/klassen",      label: "Klassenlisten", icon: "building2" },
  { href: "/sekretariat/neuanmeldung", label: "Neuanmeldung",  icon: "userCheck" },
  { href: "/sekretariat/fehlzeiten",   label: "Fehlzeiten",    icon: "calendarX" },
  { href: "/sekretariat/atteste",      label: "Atteste",       icon: "fileCheck" },
  { href: "/sekretariat/zeugnisse",    label: "Zeugnisse",     icon: "award" },
  { href: "/sekretariat/anzeigetafel", label: "Anzeigetafel",  icon: "monitor" },
  // Verwaltungsbereiche des Sekretariats
  { href: "/admin/nutzer",                  label: "Nutzer",              icon: "users" },
  { href: "/admin/import",                  label: "Import",              icon: "fileCheck" },
  { href: "/admin/klassen",                 label: "Klassen verwalten",   icon: "building2" },
  { href: "/admin/faecher",                 label: "Fächer",              icon: "bookOpen" },
  { href: "/admin/stundenplan",             label: "Stundenplan",         icon: "calendar" },
  { href: "/admin/vertretungsplan",         label: "Vertretungsplan",     icon: "refreshCw" },
  { href: "/admin/schulkalender",           label: "Schulkalender",       icon: "calendarDays" },
  { href: "/admin/fehlzeiten",              label: "Fehlzeiten verwalten",icon: "calendarX" },
  { href: "/admin/elternverwaltung",        label: "Elternverwaltung",    icon: "users" },
  { href: "/admin/elternsprechtag",         label: "Elternsprechtag",     icon: "calendarDays" },
  { href: "/admin/nachrichten",             label: "Nachrichten",         icon: "messageSquare" },
  { href: "/admin/postfach",                label: "Postfach",            icon: "mail" },
  { href: "/admin/abgaben",                 label: "Abgaben",             icon: "clipboardEdit" },
  { href: "/admin/ressourcen",              label: "Ressourcen",          icon: "box" },
  { href: "/admin/anzeigetafel-verwaltung", label: "Anzeigetafel-Inhalte",icon: "monitor" },
  { href: "/search",                        label: "Suche",               icon: "search" },
];

/** Navigation passend zur Rolle (leer für alle anderen). */
export function navForRole(role: string): NavItem[] {
  if (role === "rector") return RECTOR_NAV;
  if (role === "secretary") return SECRETARY_NAV;
  return [];
}
