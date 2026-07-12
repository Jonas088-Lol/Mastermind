/* Copyright 2026 Elian Schock, Jonas Schwenk */

/**
 * Zeitzonen-Helfer für Europe/Berlin.
 *
 * Hintergrund: `new Date().toISOString().slice(0, 10)` liefert den Kalendertag
 * in UTC. Für deutsche Nutzer kippt dieser UTC-Tag bereits um 01:00 (Winter)
 * bzw. 02:00 (Sommer) Ortszeit auf das nächste Datum. Streak, Tagesbonus und
 * Quests würden Aktivität dann dem falschen Kalendertag zuordnen.
 *
 * Diese Helfer bestimmen Tagesgrenzen konsequent in der Zeitzone Europe/Berlin —
 * ohne externe Abhängigkeit, allein über `Intl.DateTimeFormat`. DST-Wechsel in
 * Berlin finden immer um 02–03 Uhr statt (nie um Mitternacht), weshalb der
 * Mitternachts-Offset für den ganzen Kalendertag eindeutig ist.
 */

const BERLIN_TZ = "Europe/Berlin";

const berlinFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BERLIN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23", // 00–23 Uhr, kein "24" um Mitternacht
});

type BerlinFields = {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number; // 0–23
  minute: number;
  second: number;
};

/** Zerlegt einen Instant in seine Wall-Clock-Bestandteile in Europe/Berlin. */
function berlinFields(date: Date): BerlinFields {
  const parts: Record<string, string> = {};
  for (const part of berlinFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Offset (Berlin − UTC) in Millisekunden für den angegebenen Instant.
 * Positiv (z. B. +3.600.000 im Winter, +7.200.000 im Sommer).
 */
function berlinOffsetMs(date: Date): number {
  const f = berlinFields(date);
  const asIfUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asIfUtc - date.getTime();
}

/**
 * Kalendertag in Europe/Berlin als "YYYY-MM-DD".
 * Ersetzt `new Date().toISOString().slice(0, 10)` (das den UTC-Tag liefert).
 */
export function berlinDayKey(date: Date = new Date()): string {
  const f = berlinFields(date);
  return `${f.year}-${pad2(f.month)}-${pad2(f.day)}`;
}

/**
 * UTC-Instant, der Berliner Mitternacht (00:00 Ortszeit) des Kalendertages
 * von `date` entspricht. Geeignet als untere Grenze für `createdAt >= …`-Filter
 * auf echten Zeitstempeln.
 */
export function berlinStartOfDay(date: Date = new Date()): Date {
  const f = berlinFields(date);
  // Mitternacht des Berliner Tages, zunächst naiv als UTC interpretiert …
  const midnightAsUtc = Date.UTC(f.year, f.month - 1, f.day, 0, 0, 0);
  // … dann um den an diesem Tag gültigen Berlin-Offset korrigiert. Der Offset
  // wird am Mitternachts-Instant bestimmt; da Berlin nie um Mitternacht umstellt,
  // ist er für den ganzen Tag korrekt.
  const offset = berlinOffsetMs(new Date(midnightAsUtc));
  return new Date(midnightAsUtc - offset);
}

/**
 * UTC-Instant, der Berliner Mitternacht am Montag der aktuellen Woche entspricht
 * (Woche = Montag–Sonntag). Geeignet als untere Grenze für Wochen-Aggregationen.
 */
export function berlinStartOfWeek(date: Date = new Date()): Date {
  const f = berlinFields(date);
  // Wochentag des Berliner Kalendertages (0 = So … 6 = Sa) über einen
  // UTC-Mittags-Instant bestimmen — DST-frei, da UTC keine Umstellung kennt.
  const dow = new Date(Date.UTC(f.year, f.month - 1, f.day, 12)).getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  // Kalendarisch auf Montag zurückrechnen (wieder über UTC-Mittag, damit die
  // Tagesberechnung unabhängig von DST-Sprüngen bleibt) …
  const mondayNoon = new Date(Date.UTC(f.year, f.month - 1, f.day, 12) - daysSinceMonday * 86_400_000);
  // … und daraus die exakte Berliner Mitternacht ableiten.
  return berlinStartOfDay(mondayNoon);
}

/**
 * UTC-Instant der Berliner Mitternacht am 1. des aktuellen Monats.
 * Untere Grenze für Monats-Aggregationen (rollt zur deutschen Mitternacht).
 */
export function berlinStartOfMonth(date: Date = new Date()): Date {
  const f = berlinFields(date);
  return berlinStartOfDay(new Date(Date.UTC(f.year, f.month - 1, 1, 12)));
}

/**
 * UTC-Instant kurz vor Berliner Mitternacht am Monatsende (letzter Moment des Monats).
 */
export function berlinEndOfMonth(date: Date = new Date()): Date {
  const f = berlinFields(date);
  // Start des Folgemonats minus 1 ms
  const nextMonthNoon = new Date(Date.UTC(f.month === 12 ? f.year + 1 : f.year, f.month % 12, 1, 12));
  return new Date(berlinStartOfDay(nextMonthNoon).getTime() - 1);
}

/** Monats-Schlüssel "YYYY-M" in Europe/Berlin (für deterministische Monats-Seeds). */
export function berlinMonthKey(date: Date = new Date()): string {
  const f = berlinFields(date);
  return `${f.year}-${f.month - 1}`;
}
