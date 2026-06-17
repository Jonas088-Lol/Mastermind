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
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schul-Admin" };

function buildIntegrations(dbSso: { provider: string; enabled: boolean }[]) {
  const ssoMap = Object.fromEntries(dbSso.map((c) => [c.provider, c.enabled]));
  return [
    { name: "Microsoft Entra SSO", configured: Boolean(process.env.AZURE_CLIENT_ID) || Boolean(ssoMap["entra"]) },
    { name: "Google Workspace", configured: Boolean(process.env.GOOGLE_CLIENT_ID) || Boolean(ssoMap["google"]) },
    { name: "Apple School Manager", configured: false },
    { name: "Untis-Stundenplan", configured: false },
    { name: "WebUntis API", configured: false },
  ];
}

const ROLE_LABEL: Record<string, string> = {
  student: "Schüler",
  teacher: "Lehrkraft",
  parent: "Elternteil",
  admin: "Admin",
  super: "Super-Admin",
};

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  return `vor ${d} Tagen`;
}

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

  const [school, dbSsoConfigs] = await Promise.all([
    schoolId
      ? prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, plan: true, seats: true } })
      : null,
    schoolId
      ? prisma.ssoConfig.findMany({ where: { schoolId }, select: { provider: true, enabled: true } })
      : Promise.resolve([]),
  ]);

  const schoolName = school?.name ?? "Schule";
  const firstName = session.name.split(" ")[0];
  const integrations = buildIntegrations(dbSsoConfigs);

  // Real metrics
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [loginsToday, aiUsageMonth, activeUserCount, twoFaTeachers] = await Promise.all([
    prisma.session.count({
      where: { createdAt: { gte: startOfDay } },
    }),
    prisma.aiQuotaEntry.aggregate({
      _sum: { used: true },
      where: { updatedAt: { gte: startOfMonth } },
    }),
    prisma.user.count({ where: schoolId ? { schoolId } : {} }),
    prisma.user.count({ where: { role: "teacher", twoFactor: true, ...(schoolId ? { schoolId } : {}) } }),
  ]);

  const aiRequestsMonth = aiUsageMonth._sum.used ?? 0;

  // Dynamic admin tasks derived from DB state
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [neverLoggedIn, pendingTeachers, openSubmissions] = await Promise.all([
    prisma.user.count({
      where: { ...(schoolId ? { schoolId } : {}), sessions: { none: {} }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.user.count({
      where: { ...(schoolId ? { schoolId } : {}), role: "teacher", verifiedAt: null },
    }),
    prisma.submission.count({
      where: { status: "submitted", ...(schoolId ? { assignment: { class: { schoolId } } } : {}) },
    }),
  ]);

  type AdminTask = { title: string; body: string; severity: "info" | "warning" | "danger" | "neutral"; cta: string; href: string };
  const adminTasks: AdminTask[] = [];
  if (neverLoggedIn > 0) {
    adminTasks.push({
      title: `${neverLoggedIn} ${neverLoggedIn === 1 ? "Nutzer hat" : "Nutzer haben"} kein Login eingelöst`,
      body: "In den letzten 7 Tagen registriert – bitte erinnern.",
      severity: "warning",
      cta: "Nutzer anzeigen",
      href: "/admin/nutzer",
    });
  }
  if (pendingTeachers > 0) {
    adminTasks.push({
      title: `${pendingTeachers} unverifizierte${pendingTeachers === 1 ? "r Lehrer" : " Lehrer"}`,
      body: `${pendingTeachers === 1 ? "Eine Lehrkraft hat" : `${pendingTeachers} Lehrkräfte haben`} die E-Mail noch nicht bestätigt.`,
      severity: "danger",
      cta: "Prüfen",
      href: "/admin/nutzer",
    });
  }
  if (openSubmissions > 0) {
    adminTasks.push({
      title: `${openSubmissions} Abgabe${openSubmissions === 1 ? "" : "n"} warten auf Korrektur`,
      body: "Schüler warten auf Feedback ihrer Lehrkräfte.",
      severity: "info",
      cta: "Übersicht",
      href: "/admin/abgaben",
    });
  }
  if (school && totalUsers >= school.seats * 0.9) {
    adminTasks.push({
      title: `Kapazität nahezu erreicht: ${totalUsers} / ${school.seats} Sitze`,
      body: "90 % der Lizenz-Kapazität genutzt. Erweiterung empfohlen.",
      severity: "warning",
      cta: "Lizenz",
      href: "/admin/lizenz",
    });
  }

  // Audit entries from real DB activity
  const [recentGrades, recentCreatedUsers] = await Promise.all([
    prisma.grade.findMany({
      where: schoolId ? { subject: { schoolId } } : {},
      include: {
        teacher: { select: { name: true } },
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 4,
    }),
    prisma.user.findMany({
      where: { ...(schoolId ? { schoolId } : {}), createdAt: { gte: sevenDaysAgo } },
      select: { name: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  type RawAuditEntry = { actor: string; action: string; target: string; detail: string; date: Date };
  const rawAuditEntries: RawAuditEntry[] = [
    ...recentGrades.map((g) => ({
      actor: g.teacher.name,
      action: "Note eingetragen",
      target: g.student.name,
      detail: `${g.subject.name} · Note ${g.value.toFixed(1)}`,
      date: g.date,
    })),
    ...recentCreatedUsers.map((u) => ({
      actor: "System",
      action: "Nutzer registriert",
      target: u.name,
      detail: `Rolle: ${ROLE_LABEL[u.role] ?? u.role}`,
      date: u.createdAt,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

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
              {totalUsers} Nutzer · {classCount} Klassen{school ? ` · ${totalUsers} / ${school.seats} Sitze` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api/admin/dsgvo-export"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-3.5" />
            DSGVO-Export
          </Link>
          <Link
            href="/admin/nutzer/neu"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <UserPlus className="size-3.5" />
            Nutzer einladen
          </Link>
          <Link
            href="/admin/stundenplan"
            className={buttonVariants({ size: "sm" })}
          >
            <Upload className="size-3.5" />
            Stundenplan
          </Link>
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
                  {adminTasks.length} offene Vorgänge
                </p>
              </div>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {adminTasks.length === 0 ? (
                <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
                  Keine offenen Vorgänge. Alles in Ordnung.
                </p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {adminTasks.map((t) => (
                    <li
                      key={t.title}
                      className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface"
                    >
                      <SeverityDot severity={t.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t.title}</p>
                        <p className="mt-1 text-xs text-muted-fg">{t.body}</p>
                      </div>
                      <Link href={t.href} className={buttonVariants({ size: "sm", variant: "secondary" })}>
                        {t.cta}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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
            <CardBody className="px-0! pb-0!">
              {rawAuditEntries.length === 0 ? (
                <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
                  Noch keine Aktivitäten aufgezeichnet.
                </p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {rawAuditEntries.map((a, i) => (
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
                        {relativeTime(a.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-brand/40 bg-gradient-to-br from-brand/8 to-transparent">
            <CardBody className="p-5!">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Lizenz · {school?.plan ?? "basic"}
                </p>
              </div>
              <p className="mt-4 text-base font-semibold leading-snug">
                {totalUsers} / {school?.seats ?? "—"} Sitze belegt
              </p>
              <Progress
                value={school ? Math.min(100, Math.round((totalUsers / school.seats) * 100)) : 0}
                tone="brand"
                className="mt-3"
              />
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">Plan</span>
                  <span className="font-semibold capitalize">{school?.plan ?? "—"}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">Sitze</span>
                  <span className="font-mono">{school?.seats ?? "—"}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-fg">Abrechnungsdetails</span>
                  <span className="text-xs text-muted-fg">→ Plattform</span>
                </li>
              </ul>
              <Link href="/admin/lizenz" className={buttonVariants({ className: "mt-5 w-full" })}>
                Lizenz verwalten
                <ArrowRight className="size-3.5" />
              </Link>
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
            <CardBody className="px-0! pb-0!">
              <ul className="divide-y divide-border border-t border-border">
                {integrations.map((i) => (
                  <li
                    key={i.name}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface"
                  >
                    <IntegrationDot status={i.configured ? "active" : "off"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="truncate text-xs text-muted-fg">
                        {i.configured ? "Aktiv" : "Nicht konfiguriert"}
                      </p>
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
                <SystemRow icon={Database} label="Datenbank" detail="Verbunden" ok />
                <SystemRow
                  icon={ShieldCheck}
                  label="2FA-Abdeckung"
                  detail={teacherCount > 0 ? `${twoFaTeachers} / ${teacherCount} Lehrer` : "Keine Lehrer"}
                  ok={twoFaTeachers === teacherCount && teacherCount > 0}
                  warn={twoFaTeachers < teacherCount}
                />
                <SystemRow
                  icon={Activity}
                  label="Logins heute"
                  detail={`${loginsToday} Sessions`}
                  ok={loginsToday > 0}
                />
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
