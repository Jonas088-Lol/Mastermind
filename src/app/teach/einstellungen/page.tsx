import {
  Bell,
  Check,
  Download,
  Eye,
  Globe,
  Key,
  Laptop,
  Mail,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { changePassword } from "./actions";
import { PrefSelector } from "./PrefSelector";
import { PrefToggle } from "./PrefToggle";
import { SessionLogoutButton } from "./SessionLogoutButton";

export const metadata: Metadata = { title: "Einstellungen" };

const SECTIONS = [
  { id: "account", label: "Account", icon: Key },
  { id: "ki", label: "KI-Funktionen", icon: Sparkles },
  { id: "benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { id: "privatsphaere", label: "Privatsphäre", icon: Eye },
  { id: "darstellung", label: "Darstellung", icon: Palette },
  { id: "sprache", label: "Sprache", icon: Globe },
  { id: "geraete", label: "Geräte", icon: Laptop },
  { id: "daten", label: "Daten & DSGVO", icon: Shield },
] as const;

type Prefs = Record<string, boolean | string>;

function pref(prefs: Prefs, key: string, defaultVal: boolean): boolean;
function pref(prefs: Prefs, key: string, defaultVal: string): string;
function pref(prefs: Prefs, key: string, defaultVal: boolean | string): boolean | string {
  if (key in prefs) return prefs[key] as boolean | string;
  return defaultVal;
}

export default async function TeachEinstellungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      twoFactor: true,
      createdAt: true,
      prefs: true,
      sessions: {
        select: { id: true, ipAddress: true, userAgent: true, lastUsedAt: true, token: true },
        orderBy: { lastUsedAt: "desc" },
        take: 5,
      },
      school: { select: { name: true } },
    },
  });

  const prefs: Prefs = user?.prefs ? JSON.parse(user.prefs) : {};
  const currentToken = session.sid;
  const schoolLine = user?.school?.name
    ? `${user.school.name} · seit ${user?.createdAt.getFullYear()}`
    : "Kein Schulkonto verknüpft";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Konto · {session.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          KI-Verhalten, Benachrichtigungen, Geräte und Daten verwalten.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Einstellungen-Sektionen">
            <ul className="flex gap-1 overflow-x-auto border border-border bg-bg p-1 lg:flex-col lg:gap-0.5 lg:p-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg lg:text-sm"
                  >
                    <s.icon className="size-4" strokeWidth={1.75} />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-8">
          {/* ── Account ────────────────────────────────────── */}
          <section id="account">
            <Card>
              <CardHeader><CardTitle>Account</CardTitle></CardHeader>
              <CardBody className="space-y-5">
                <Field label="E-Mail" value={user?.email ?? "—"} />
                <Field label="Schul-Account" value={schoolLine} status={user?.school ? "ok" : undefined} />
                <Field
                  label="2-Faktor-Authentifizierung"
                  value={user?.twoFactor ? "Aktiv · Authenticator-App" : "Nicht aktiviert"}
                  status={user?.twoFactor ? "ok" : undefined}
                />
                <details>
                  <summary className="flex cursor-pointer items-center justify-between py-1 text-sm font-semibold">
                    Passwort ändern
                    <span className="text-xs font-normal text-muted-fg">Klicken zum Aufklappen</span>
                  </summary>
                  <form action={changePassword} className="mt-3 space-y-3">
                    <Input name="current" type="password" placeholder="Aktuelles Passwort" required />
                    <Input name="new" type="password" placeholder="Neues Passwort (min. 8 Zeichen)" minLength={8} required />
                    <Button type="submit" size="sm">Passwort ändern</Button>
                  </form>
                </details>
              </CardBody>
            </Card>
          </section>

          {/* ── KI-Funktionen ──────────────────────────────── */}
          <section id="ki">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>KI-Funktionen</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">Wie viel Hilfe willst du in deinem Workflow?</p>
                </div>
                <Badge variant="brand"><Sparkles className="size-3" />v3</Badge>
              </CardHeader>
              <CardBody className="space-y-1">
                <PrefToggle prefKey="ki_vorbewertung" label="Auto-Vorbewertung von Abgaben" detail="KI bewertet vor — du nimmst per Klick an oder änderst" icon={<Sparkles className="size-4" />} defaultOn={pref(prefs, "ki_vorbewertung", true) as boolean} />
                <PrefToggle prefKey="ki_aufgaben_vorschlag" label="Aufgaben-Vorschläge bei neuen Aufgaben" detail="KI schlägt Wortlaut + Bewertungsraster vor" icon={<Sparkles className="size-4" />} defaultOn={pref(prefs, "ki_aufgaben_vorschlag", true) as boolean} />
                <PrefToggle prefKey="ki_risiko_schueler" label="Risiko-Schüler erkennen" detail="KI markiert Schüler mit fallendem Trend automatisch" icon={<Sparkles className="size-4" />} defaultOn={pref(prefs, "ki_risiko_schueler", true) as boolean} />
                <PrefToggle prefKey="ki_nachrichten" label="Auto-Antwort-Vorschläge in Nachrichten" detail="3 Vorschläge pro eingehender Mail · Du wählst" icon={<Sparkles className="size-4" />} defaultOn={pref(prefs, "ki_nachrichten", true) as boolean} />
                <PrefToggle prefKey="ki_lehrplan_check" label="Lehrplan-Check" detail="Generierte Aufgaben werden gegen KMK-Standards validiert" icon={<Sparkles className="size-4" />} defaultOn={pref(prefs, "ki_lehrplan_check", true) as boolean} />
              </CardBody>
            </Card>
          </section>

          {/* ── Benachrichtigungen ─────────────────────────── */}
          <section id="benachrichtigungen">
            <Card>
              <CardHeader><CardTitle>Benachrichtigungen</CardTitle></CardHeader>
              <CardBody className="space-y-1">
                <PrefToggle prefKey="notif_eltern_msg" label="Push · Neue Eltern-Nachricht" detail="Sofort, wenn ein Elternteil schreibt" icon={<Smartphone className="size-4" />} defaultOn={pref(prefs, "notif_eltern_msg", true) as boolean} />
                <PrefToggle prefKey="notif_schueler_frage" label="Push · Schüler-Frage zu Aufgabe" detail="Direkt im Tutor- oder Aufgaben-Kontext" icon={<Smartphone className="size-4" />} defaultOn={pref(prefs, "notif_schueler_frage", true) as boolean} />
                <PrefToggle prefKey="notif_tageszusammenfassung" label="E-Mail · Tageszusammenfassung 7 Uhr" detail="Was steht heute an? Vertretungen, Korrekturen, Termine" icon={<Mail className="size-4" />} defaultOn={pref(prefs, "notif_tageszusammenfassung", true) as boolean} />
                <PrefToggle prefKey="notif_korrektur_stapel" label="Push · Korrektur-Stapel ≥ 20" detail="Erinnerung, wenn der Stapel groß wird" icon={<Bell className="size-4" />} defaultOn={pref(prefs, "notif_korrektur_stapel", false) as boolean} />
                <PrefToggle prefKey="notif_ruhezeiten" label="Ruhe-Zeiten (18:00 – 07:00)" detail="Push wird unterdrückt · Notfälle ausgenommen" icon={<Bell className="size-4" />} defaultOn={pref(prefs, "notif_ruhezeiten", true) as boolean} />
              </CardBody>
            </Card>
          </section>

          {/* ── Privatsphäre ───────────────────────────────── */}
          <section id="privatsphaere">
            <Card>
              <CardHeader><CardTitle>Privatsphäre</CardTitle></CardHeader>
              <CardBody className="space-y-1">
                <PrefToggle prefKey="priv_sprechstunde" label="Sprechstunde öffentlich für Eltern" detail="Eltern können selbst Termine buchen" icon={<Eye className="size-4" />} defaultOn={pref(prefs, "priv_sprechstunde", true) as boolean} />
                <PrefToggle prefKey="priv_statistiken_teilen" label="Klassen-Statistiken im Lehrer-Kollegium teilen" detail="Anonymisiert · für Fachkonferenzen" icon={<Eye className="size-4" />} defaultOn={pref(prefs, "priv_statistiken_teilen", false) as boolean} />
                <PrefToggle prefKey="priv_ki_lernen" label="KI darf aus Korrekturen lernen" detail="Anonymisiert · verbessert Vorbewertungs-Qualität" icon={<Eye className="size-4" />} defaultOn={pref(prefs, "priv_ki_lernen", true) as boolean} />
              </CardBody>
            </Card>
          </section>

          {/* ── Darstellung ────────────────────────────────── */}
          <section id="darstellung">
            <Card>
              <CardHeader><CardTitle>Darstellung</CardTitle></CardHeader>
              <CardBody className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold">Theme</p>
                  <PrefSelector
                    prefKey="theme"
                    current={(pref(prefs, "theme", "system")) as string}
                    options={[
                      { value: "light", label: "Hell" },
                      { value: "dark", label: "Dunkel" },
                      { value: "system", label: "System" },
                    ]}
                  />
                </div>
                <PrefToggle prefKey="compact_tables" label="Kompakte Tabellen" detail="Mehr Zeilen pro Bildschirm" icon={<Palette className="size-4" />} defaultOn={pref(prefs, "compact_tables", false) as boolean} />
              </CardBody>
            </Card>
          </section>

          {/* ── Sprache ────────────────────────────────────── */}
          <section id="sprache">
            <Card>
              <CardHeader><CardTitle>Sprache</CardTitle></CardHeader>
              <CardBody>
                <PrefSelector
                  prefKey="lang"
                  current={(pref(prefs, "lang", "de")) as string}
                  options={[
                    { value: "de", label: "Deutsch", sub: "DE" },
                    { value: "en", label: "English", sub: "EN" },
                    { value: "tr", label: "Türkçe", sub: "TR" },
                    { value: "pl", label: "Polski", sub: "PL" },
                  ]}
                />
              </CardBody>
            </Card>
          </section>

          {/* ── Geräte & Sessions ──────────────────────────── */}
          <section id="geraete">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Geräte & Sessions</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">{user?.sessions.length ?? 0} aktive Sessions</p>
                </div>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                {!user?.sessions.length ? (
                  <p className="border-t border-border px-5 py-4 text-sm text-muted-fg">Keine Sessions.</p>
                ) : (
                  <ul className="divide-y divide-border border-t border-border">
                    {user.sessions.map((s) => {
                      const isCurrent = s.token === currentToken;
                      return (
                        <li key={s.id} className="flex items-center gap-4 px-5 py-4">
                          {isCurrent ? (
                            <Laptop className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
                          ) : (
                            <Smartphone className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">
                                {s.userAgent?.slice(0, 60) ?? "Unbekanntes Gerät"}
                              </p>
                              {isCurrent && <Badge variant="brand">Jetzt</Badge>}
                            </div>
                            <p className="text-xs text-muted-fg">
                              {s.ipAddress ?? "—"} · {isCurrent ? "diese Sitzung" : s.lastUsedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                          {!isCurrent && <SessionLogoutButton sessionId={s.id} />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>

          {/* ── Daten & DSGVO ──────────────────────────────── */}
          <section id="daten">
            <Card>
              <CardHeader><CardTitle>Daten & DSGVO</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
                  <DataAction icon={<Download className="size-4" />} label="Daten exportieren" detail="Alle eigenen Daten · ZIP" />
                  <DataAction icon={<Trash2 className="size-4" />} label="Account schließen" detail="Schul-Admin-Bestätigung erforderlich" danger />
                </div>
                <p className="text-xs text-muted-fg">
                  Schul-Daten verbleiben bei der Schule. Persönliche Daten gem. DSGVO Art. 17 löschbar.
                </p>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, status }: { label: string; value: string; status?: "ok" }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
          {status === "ok" && <Check className="size-3 text-success" strokeWidth={2.5} />}
          {value}
        </p>
      </div>
    </div>
  );
}

function DataAction({ icon, label, detail, danger }: { icon: React.ReactNode; label: string; detail: string; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`group flex items-start gap-3 bg-bg p-5 text-left transition-colors ${danger ? "hover:bg-danger/[0.04]" : "hover:bg-surface"}`}
    >
      <span className={`grid size-9 shrink-0 place-items-center transition-colors ${danger ? "bg-danger/10 text-danger group-hover:bg-danger group-hover:text-bg" : "bg-surface text-fg group-hover:bg-fg group-hover:text-bg"}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? "text-danger" : ""}`}>{label}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
    </button>
  );
}
