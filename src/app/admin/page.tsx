import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  GraduationCap,
  KeyRound,
  Palette,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schul-Admin" };

const tasks = [
  {
    title: "12 Schüler haben kein Login eingelöst",
    body: "Welcome-Mails wurden vor 7 Tagen versendet. Erinnerung schicken?",
    severity: "warning" as const,
    cta: "Erinnern",
  },
  {
    title: "Untis-Stundenplan-Import bereit",
    body: "Datei hochgeladen am 10. März. 32 Klassen erkannt — Vorschau prüfen.",
    severity: "info" as const,
    cta: "Prüfen",
  },
  {
    title: "Lizenz läuft in 47 Tagen aus",
    body: "Pro-Paket bis 14. Juni 2026. Verlängerung jetzt sichert keine Unterbrechung.",
    severity: "neutral" as const,
    cta: "Verlängern",
  },
  {
    title: "2 neue Lehrer-Anträge",
    body: "Hr. Schäfer und Fr. Otto haben sich registriert — Freischaltung ausstehend.",
    severity: "danger" as const,
    cta: "Prüfen",
  },
];

const audit = [
  {
    actor: "Andrea Hoffmann",
    action: "Lehrer-Account",
    target: "Markus Becker",
    detail: "Rolle aktualisiert: Lehrer → Lehrer + Klassensprecher",
    time: "vor 12 Min.",
  },
  {
    actor: "System · SCIM",
    action: "Nutzer importiert",
    target: "8 Schüler · Klasse 7c",
    detail: "Quelle: schule.de/SCIM-API",
    time: "vor 2 Std.",
  },
  {
    actor: "Andrea Hoffmann",
    action: "SSO-Konfig",
    target: "Microsoft Entra ID",
    detail: "Tenant gewechselt · 234 Nutzer betroffen",
    time: "gestern",
  },
  {
    actor: "Plattform",
    action: "Backup",
    target: "Datenbank",
    detail: "Tägliches Snapshot · 4,7 GB nach Frankfurt",
    time: "gestern",
  },
  {
    actor: "Andrea Hoffmann",
    action: "Branding",
    target: "Akzentfarbe",
    detail: "Hex #1E3A8A → #2563EB",
    time: "vor 2 Tagen",
  },
];

const integrations = [
  { name: "Microsoft Entra SSO", status: "active" as const, detail: "234 Nutzer" },
  { name: "Untis-Stundenplan", status: "active" as const, detail: "letzter Import vor 2 Tagen" },
  { name: "Google Workspace", status: "ready" as const, detail: "Bereit zum Aktivieren" },
  { name: "Apple School Manager", status: "off" as const, detail: "Nicht konfiguriert" },
  { name: "WebUntis API", status: "active" as const, detail: "Sync alle 15 Min." },
];

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect("/");

  const schoolId = session.schoolId;

  const [studentCount, teacherCount, parentCount, adminCount, classCount, subjectCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "student", ...(schoolId ? { schoolId } : {}) } }),
      prisma.user.count({ where: { role: "teacher", ...(schoolId ? { schoolId } : {}) } }),
      prisma.user.count({ where: { role: "parent", ...(schoolId ? { schoolId } : {}) } }),
      prisma.user.count({ where: { role: { in: ["admin", "super"] }, ...(schoolId ? { schoolId } : {}) } }),
      prisma.schoolClass.count({ where: schoolId ? { schoolId } : {} }),
      prisma.subject.count({ where: schoolId ? { schoolId } : {} }),
    ]);

  const totalUsers = studentCount + teacherCount + parentCount + adminCount;

  const school = schoolId
    ? await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } })
    : null;

  const schoolName = school?.name ?? "Schule";
  const firstName = session.name.split(" ")[0];

  // Real metrics
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [loginsToday, aiUsageMonth, activeUserCount] = await Promise.all([
    prisma.session.count({
      where: { createdAt: { gte: startOfDay } },
    }),
    prisma.aiQuotaEntry.aggregate({
      _sum: { used: true },
      where: { updatedAt: { gte: startOfMonth } },
    }),
    prisma.user.count({ where: schoolId ? { schoolId } : {} }),
  ]);

  const aiRequestsMonth = aiUsageMonth._sum.used ?? 0;

  const userBreakdown = [
    { role: "Schüler", count: studentCount, total: Math.max(studentCount, 1), tone: "brand" as const },
    { role: "Lehrer", count: teacherCount, total: Math.max(teacherCount, 1), tone: "info" as const },
    { role: "Eltern", count: parentCount, total: Math.max(parentCount, 1), tone: "success" as const },
    { role: "Admin & Leitung", count: adminCount, total: Math.max(adminCount, 1), tone: "outline" as const },
  ];

  const stats = [
    {
      label: "Aktive Nutzer",
      value: String(activeUserCount),
      suffix: `${studentCount} Schüler · ${teacherCount} Lehrer`,
      icon: Users,
      tone: "text-brand",
    },
    {
      label: "Klassen",
      value: String(classCount),
      suffix: "Schuljahr 2025/26",
      icon: GraduationCap,
      tone: "text-fg",
    },
    {
      label: "Logins · Heute",
      value: String(loginsToday),
      suffix: "neue Sessions heute",
      icon: Activity,
      tone: "text-success",
    },
    {
      label: "KI-Anfragen · Monat",
      value: String(aiRequestsMonth),
      suffix: "von 25.000",
      icon: Sparkles,
      tone: "text-info",
    },
  ] as const;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center bg-fg text-bg">
            <Building2 className="size-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              {schoolName} · Schulleitung · Sekretariat · Vertrauenslehrer
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Hallo {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {totalUsers} Nutzer · {classCount} Klassen · Lizenz läuft in 47 Tagen
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Download className="size-3.5" />
            DSGVO-Export
          </Button>
          <Link
            href="/admin/nutzer/neu"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <UserPlus className="size-3.5" />
            Nutzer einladen
          </Link>
          <Button size="sm">
            <Upload className="size-3.5" />
            Untis importieren
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {s.label}
              </p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted-fg">{s.suffix}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Aufgaben</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {tasks.length} offene Vorgänge · sortiert nach Dringlichkeit
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Filter
              </Button>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {tasks.map((t) => (
                  <li
                    key={t.title}
                    className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface"
                  >
                    <SeverityDot severity={t.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="mt-1 text-xs text-muted-fg">{t.body}</p>
                    </div>
                    <Button size="sm" variant="secondary">
                      {t.cta}
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Nutzer-Übersicht</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {totalUsers} registrierte Nutzer
                </p>
              </div>
              <Link
                href="/admin/nutzer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Alle Nutzer
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody>
              <ul className="space-y-4">
                {userBreakdown.map((u) => {
                  return (
                    <li key={u.role} className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-semibold">{u.role}</p>
                        <p className="font-mono text-xs tabular-nums">
                          <span className="font-bold">{u.count}</span>
                          <span className="text-muted-fg"> Nutzer</span>
                        </p>
                      </div>
                      <Progress
                        value={100}
                        tone={u.tone === "brand" ? "brand" : u.tone === "info" ? "brand" : "success"}
                      />
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Audit-Log</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  DSGVO-konform · jede Änderung nachvollziehbar
                </p>
              </div>
              <Link
                href="/admin/audit"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Vollständiges Log
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {audit.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-surface"
                  >
                    <Avatar name={a.actor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{a.actor}</span>
                        <span className="text-muted-fg"> · </span>
                        <span>{a.action}</span>
                        <span className="text-muted-fg"> · </span>
                        <span className="font-medium">{a.target}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">
                        {a.detail}
                      </p>
                    </div>
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-fg sm:inline">
                      {a.time}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.08] to-transparent">
            <CardBody className="!p-5">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Lizenz · Pro
                </p>
              </div>
              <p className="mt-4 text-base font-semibold leading-snug">
                {totalUsers} Nutzer aktiv
              </p>
              <Progress value={Math.min(100, (totalUsers / 1000) * 100)} tone="brand" className="mt-3" />
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">Plan</span>
                  <span className="font-semibold">Pro Schule</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">Vertragsende</span>
                  <span className="font-mono">14. Juni 2026</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">Monatlich</span>
                  <span className="font-mono">1.890 €</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">AVV</span>
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-3.5" />
                    signiert
                  </span>
                </li>
              </ul>
              <Button className="mt-5 w-full">
                Lizenz verlängern
                <ArrowRight className="size-3.5" />
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrationen</CardTitle>
              <Link
                href="/admin/integrationen"
                className="text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg"
              >
                Verwalten
              </Link>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {integrations.map((i) => (
                  <li
                    key={i.name}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface"
                  >
                    <IntegrationDot status={i.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="truncate text-xs text-muted-fg">{i.detail}</p>
                    </div>
                    <ArrowUpRight className="size-3.5 text-muted-fg" />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <QuickTile
              href="/admin/branding"
              icon={<Palette className="size-4" />}
              label="Branding"
              hint="Logo · Farben"
            />
            <QuickTile
              href="/admin/nutzer"
              icon={<Users className="size-4" />}
              label="Nutzer"
              hint={`${totalUsers} aktiv`}
            />
            <QuickTile
              href="/admin/klassen"
              icon={<ClipboardList className="size-4" />}
              label="Klassen"
              hint={`${classCount} Klassen`}
            />
            <QuickTile
              href="/admin/sicherheit"
              icon={<ShieldCheck className="size-4" />}
              label="Sicherheit"
              hint="2FA · SSO"
            />
            <QuickTile
              href="/admin/faecher"
              icon={<BookOpen className="size-4" />}
              label="Fächer"
              hint={`${subjectCount} Fächer`}
            />
            <QuickTile
              href="/admin/notenspiegel"
              icon={<BarChart3 className="size-4" />}
              label="Notenspiegel"
              hint="Alle Fächer"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System-Status</CardTitle>
              <Badge variant="success">
                <CheckCircle2 className="size-3" />
                OK
              </Badge>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2.5 text-xs">
                <SystemRow icon={Database} label="Datenbank" detail="Frankfurt am Main · p95 12ms" ok />
                <SystemRow icon={ShieldCheck} label="2FA-Abdeckung" detail={`${teacherCount} von ${teacherCount} Lehrern`} ok />
                <SystemRow icon={AlertTriangle} label="Failed Logins" detail="3 in 24h · normal" warn />
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: "info" | "warning" | "danger" | "neutral" }) {
  const tone =
    severity === "danger"
      ? "bg-danger"
      : severity === "warning"
        ? "bg-warning"
        : severity === "info"
          ? "bg-info"
          : "bg-muted-fg";
  return <span className={cn("mt-1.5 size-2 shrink-0", tone)} aria-hidden="true" />;
}

function IntegrationDot({ status }: { status: "active" | "ready" | "off" }) {
  const tone =
    status === "active"
      ? "bg-success"
      : status === "ready"
        ? "bg-warning"
        : "bg-border-strong";
  return <span className={cn("size-2 shrink-0", tone)} aria-hidden="true" />;
}

function QuickTile({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-2 border border-border bg-bg p-3 transition-colors hover:bg-surface">
      <span className="grid size-8 place-items-center bg-fg text-bg">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">
        {hint}
      </span>
    </Link>
  );
}

function SystemRow({
  icon: Icon,
  label,
  detail,
  ok,
  warn,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  detail: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const tone = ok ? "text-success" : warn ? "text-warning" : "text-muted-fg";
  return (
    <li className="flex items-center gap-2.5">
      <Icon className={cn("size-3.5", tone)} strokeWidth={1.75} />
      <span className="font-semibold">{label}</span>
      <span className="ml-auto text-muted-fg">{detail}</span>
    </li>
  );
}
