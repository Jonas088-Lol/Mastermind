import {
  Bell,
  Check,
  Download,
  Eye,
  Globe,
  Key,
  Laptop,
  LogOut,
  Mail,
  Palette,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { TwoFactorSetup } from "./2fa/TwoFactorSetup";
import { ThemeButtons } from "./ThemeButtons";
import { ToggleSection } from "./ToggleSection";
import { DeviceLogoutButton } from "./DeviceLogout";
import { logoutAllDevices, changePassword } from "./actions";

export const metadata: Metadata = { title: "Einstellungen" };

const SECTIONS = [
  { id: "account", label: "Account", icon: Key },
  { id: "benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { id: "privatsphaere", label: "Privatsphäre", icon: Eye },
  { id: "darstellung", label: "Darstellung", icon: Palette },
  { id: "sprache", label: "Sprache", icon: Globe },
  { id: "geraete", label: "Geräte", icon: Laptop },
  { id: "daten", label: "Daten & DSGVO", icon: Shield },
] as const;

const NOTIFICATION_ITEMS = [
  {
    key: "push_tasks",
    label: "Push · Aufgaben fällig",
    detail: "Erinnerung 2 Std. vor Abgabefrist",
    icon: <Smartphone className="size-4" />,
    default: true,
  },
  {
    key: "push_flashcards",
    label: "Push · Karteikarten Reminder",
    detail: "Täglich 17:00 Uhr",
    icon: <Smartphone className="size-4" />,
    default: true,
  },
  {
    key: "email_weekly",
    label: "E-Mail · Wochenrückblick",
    detail: "Sonntag 18:00 Uhr",
    icon: <Mail className="size-4" />,
    default: true,
  },
  {
    key: "push_substitution",
    label: "Push · Vertretungsplan-Änderungen",
    detail: "Sofort, wenn etwas ausfällt",
    icon: <Bell className="size-4" />,
    default: true,
  },
  {
    key: "push_likes",
    label: "Push · Community-Likes",
    detail: "Wenn jemand deine Notiz mag",
    icon: <Bell className="size-4" />,
    default: false,
  },
  {
    key: "quiet_hours",
    label: "Ruhe-Zeiten (22:00 – 07:00)",
    detail: "Push wird unterdrückt",
    icon: <Bell className="size-4" />,
    default: true,
  },
];

const PRIVACY_ITEMS = [
  {
    key: "profile_visible",
    label: "Profil sichtbar für Klassenkameraden",
    detail: "Name + Klasse + Streak",
    icon: <Eye className="size-4" />,
    default: true,
  },
  {
    key: "ranking",
    label: "In Klassen-Ranking erscheinen",
    detail: "Du bist aktuell Platz 7 in 9b",
    icon: <Eye className="size-4" />,
    default: true,
  },
  {
    key: "share_notes",
    label: "Notizen mit Klasse teilen",
    detail: "Du kannst pro Notiz entscheiden",
    icon: <Eye className="size-4" />,
    default: true,
  },
  {
    key: "ai_learning",
    label: "KI darf aus deinen Daten lernen",
    detail: "Anonymisiert · für bessere Empfehlungen",
    icon: <Eye className="size-4" />,
    default: false,
  },
];

export default async function EinstellungenPage() {
  const session = await getSession();
  const me = session
    ? await prisma.user.findUnique({
        where: { email: session.email },
        select: { email: true, twoFactor: true },
      })
    : null;

  // Fetch real sessions for Geräte section
  const sessions = session
    ? await prisma.session.findMany({
        where: {
          userId: session.userId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastUsedAt: "desc" },
      })
    : [];

  const currentToken = session?.sid;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Konto · {session?.name ?? "—"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Einstellungen
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Privatsphäre, Benachrichtigungen, Geräte und Daten verwalten.
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
          {/* ── Account ─────────────────────────────────── */}
          <section id="account">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                <Field
                  label="E-Mail"
                  value={me?.email ?? "—"}
                  action="Ändern"
                />

                {/* Password change — inline expandable form */}
                <div className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Passwort</p>
                        <p className="mt-0.5 text-xs text-muted-fg">
                          zuletzt geändert vor 47 Tagen
                        </p>
                      </div>
                      <span className="inline-flex h-8 cursor-pointer items-center rounded-none px-3 text-sm font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg">
                        Neu setzen
                      </span>
                    </summary>
                    <form action={changePassword} className="mt-3 space-y-3">
                      <Input
                        name="current"
                        type="password"
                        placeholder="Aktuelles Passwort"
                        required
                      />
                      <Input
                        name="new"
                        type="password"
                        placeholder="Neues Passwort (min. 8 Zeichen)"
                        minLength={8}
                        required
                      />
                      <Button type="submit" size="sm">
                        Passwort ändern
                      </Button>
                    </form>
                  </details>
                </div>

                <TwoFactorSetup initiallyEnabled={Boolean(me?.twoFactor)} />
                <Field
                  label="Verbundene Konten"
                  value="Microsoft Schule (SSO)"
                  action="Verwalten"
                />
              </CardBody>
            </Card>
          </section>

          {/* ── Benachrichtigungen ──────────────────────── */}
          <section id="benachrichtigungen">
            <Card>
              <CardHeader>
                <CardTitle>Benachrichtigungen</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1">
                <ToggleSection
                  items={NOTIFICATION_ITEMS}
                  storageKey="mm_notification_prefs"
                />
              </CardBody>
            </Card>
          </section>

          {/* ── Privatsphäre ────────────────────────────── */}
          <section id="privatsphaere">
            <Card>
              <CardHeader>
                <CardTitle>Privatsphäre</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1">
                <ToggleSection
                  items={PRIVACY_ITEMS}
                  storageKey="mm_privacy_prefs"
                />
              </CardBody>
            </Card>
          </section>

          {/* ── Darstellung ─────────────────────────────── */}
          <section id="darstellung">
            <Card>
              <CardHeader>
                <CardTitle>Darstellung</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                <div>
                  <p className="text-sm font-semibold">Theme</p>
                  <p className="mt-0.5 text-xs text-muted-fg">
                    Light / Dark / System · oben rechts in der Topbar umschaltbar
                  </p>
                  <div className="mt-3">
                    <ThemeButtons />
                  </div>
                </div>
                <ToggleSection
                  items={[
                    {
                      key: "reduced_motion",
                      label: "Reduzierte Bewegung",
                      detail: "Animationen werden minimiert",
                      icon: <Palette className="size-4" />,
                      default: false,
                    },
                    {
                      key: "larger_font",
                      label: "Größere Schrift",
                      detail: "+15 % für bessere Lesbarkeit",
                      icon: <Palette className="size-4" />,
                      default: false,
                    },
                  ]}
                  storageKey="mm_display_prefs"
                />
              </CardBody>
            </Card>
          </section>

          {/* ── Sprache ─────────────────────────────────── */}
          <section id="sprache">
            <Card>
              <CardHeader>
                <CardTitle>Sprache</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
                  <LangOption label="Deutsch" code="DE" active />
                  <LangOption label="English" code="EN" />
                  <LangOption label="Türkçe" code="TR" />
                  <LangOption label="Polski" code="PL" />
                </div>
                <p className="mt-3 text-xs text-muted-fg">
                  Sprache der Oberfläche. Schul-Inhalte folgen dem Klassen-Lehrplan.
                </p>
              </CardBody>
            </Card>
          </section>

          {/* ── Geräte & Sessions ───────────────────────── */}
          <section id="geraete">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Geräte & Sessions</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">
                    {sessions.length} aktive{" "}
                    {sessions.length === 1 ? "Session" : "Sessions"}
                  </p>
                </div>
                <form action={logoutAllDevices}>
                  <Button type="submit" variant="outline" size="sm">
                    <LogOut className="size-3.5" />
                    Alle abmelden
                  </Button>
                </form>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                <ul className="divide-y divide-border border-t border-border">
                  {sessions.map((s) => {
                    const isCurrent = s.token === currentToken;
                    const ua = s.userAgent ?? "";
                    const name = parseUserAgent(ua);
                    const time = isCurrent
                      ? "diese Sitzung"
                      : formatRelativeTime(s.lastUsedAt);
                    return (
                      <DeviceRow
                        key={s.id}
                        sessionId={s.id}
                        name={name}
                        location={s.ipAddress ?? "Unbekannt"}
                        time={time}
                        current={isCurrent}
                      />
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          </section>

          {/* ── Daten & DSGVO ───────────────────────────── */}
          <section id="daten">
            <Card>
              <CardHeader>
                <CardTitle>Daten & DSGVO</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
                  <DataAction
                    icon={<Download className="size-4" />}
                    label="Daten exportieren"
                    detail="Als ZIP · enthält Noten, Aufgaben, Notizen"
                  />
                  <DataAction
                    icon={<Trash2 className="size-4" />}
                    label="Account löschen"
                    detail="Endgültig · 30-Tage-Karenz · DSGVO Art. 17"
                    danger
                  />
                </div>
                <p className="text-xs text-muted-fg">
                  Hosting in Frankfurt am Main · Backup täglich · AVV mit deiner Schule
                  signiert. Mehr im{" "}
                  <a
                    href="/legal/datenschutz"
                    className="underline underline-offset-2 hover:text-fg"
                  >
                    Datenschutz
                  </a>
                  .
                </p>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseUserAgent(ua: string): string {
  if (!ua) return "Unbekanntes Gerät";
  if (/iPhone|iPad/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "iPhone · Chrome";
    if (/Safari/i.test(ua)) return "iPhone · Safari";
    return "iPhone";
  }
  if (/Android/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Android · Chrome";
    return "Android";
  }
  if (/Mac/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Mac · Chrome";
    if (/Firefox/i.test(ua)) return "Mac · Firefox";
    if (/Safari/i.test(ua)) return "Mac · Safari";
    return "Mac";
  }
  if (/Windows/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Windows · Chrome";
    if (/Firefox/i.test(ua)) return "Windows · Firefox";
    if (/Edge/i.test(ua)) return "Windows · Edge";
    return "Windows";
  }
  if (/Linux/i.test(ua)) return "Linux";
  return "Unbekanntes Gerät";
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "gestern";
  return `vor ${diffD} Tagen`;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  action,
  status,
}: {
  label: string;
  value: string;
  action: string;
  status?: "ok";
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
          {status === "ok" && (
            <Check className="size-3 text-success" strokeWidth={2.5} />
          )}
          {value}
        </p>
      </div>
      <Button variant="ghost" size="sm">
        {action}
      </Button>
    </div>
  );
}

function LangOption({
  label,
  code,
  active,
}: {
  label: string;
  code: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${
        active ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        {code}
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function DeviceRow({
  sessionId,
  name,
  location,
  time,
  current,
}: {
  sessionId: string;
  name: string;
  location: string;
  time: string;
  current?: boolean;
}) {
  const Icon = current ? Laptop : Smartphone;
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <Icon className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          {current && <Badge variant="brand">Jetzt</Badge>}
        </div>
        <p className="text-xs text-muted-fg">
          {location} · {time}
        </p>
      </div>
      {!current && <DeviceLogoutButton sessionId={sessionId} />}
    </li>
  );
}

function DataAction({
  icon,
  label,
  detail,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`group flex items-start gap-3 bg-bg p-5 text-left transition-colors ${
        danger ? "hover:bg-danger/[0.04]" : "hover:bg-surface"
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center transition-colors ${
          danger
            ? "bg-danger/10 text-danger group-hover:bg-danger group-hover:text-bg"
            : "bg-surface text-fg group-hover:bg-fg group-hover:text-bg"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? "text-danger" : ""}`}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
    </button>
  );
}
