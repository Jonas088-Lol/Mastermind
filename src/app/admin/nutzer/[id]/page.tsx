/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Key, Link2, Mail, Shield, Trash2, UserCog, X } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db/client";
import { ROLE_LABEL, effectiveRole, getSession } from "@/lib/session";
import { deleteUser, linkParentToStudent, resetTwoFactor, unlinkParentFromStudent, updateStudentFeatures, updateUserClass, updateUserRole } from "./actions";
import { STUDENT_FEATURES, parseStudentFeatures } from "@/lib/student-features";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? `${user.name} · Admin` : "Nutzer · Admin" };
}

const ROLE_OPTIONS = [
  { value: "student",   label: "Schüler" },
  { value: "teacher",   label: "Lehrer" },
  { value: "parent",    label: "Elternteil" },
  { value: "secretary", label: "Sekretariat" },
  { value: "rector",    label: "Schulleitung" },
  { value: "admin",     label: "Admin" },
];

export default async function NutzerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "nutzer")) redirect("/admin");

  const { id } = await params;

  const [user, classes] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        schoolClass: { select: { id: true, name: true } },
        sessions: {
          select: { lastUsedAt: true, ipAddress: true, userAgent: true },
          orderBy: { lastUsedAt: "desc" },
          take: 5,
        },
        teacherSubjectClasses: {
          include: {
            subject: { select: { name: true, color: true } },
            class:   { select: { name: true } },
          },
        },
        parentLinks: {
          include: {
            student: {
              select: { id: true, name: true, email: true, schoolClass: { select: { name: true } } },
            },
          },
        },
        studentParents: {
          include: {
            parent: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            studentSubmissions: true,
            teacherGrades: true,
            teacherAssignments: true,
          },
        },
      },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId ?? "" },
      select: { id: true, name: true, grade: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!user || user.schoolId !== session.schoolId) notFound();

  const isSelf    = user.id === session.userId;
  const lastSeen  = user.sessions[0]?.lastUsedAt;
  const roleLabel = ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-center gap-4">
        <Link href="/admin/nutzer" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted-fg">{user.email}</p>
        </div>
        <Badge variant={user.verifiedAt ? "success" : "warning"}>
          {user.verifiedAt ? "Verifiziert" : "Ausstehend"}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info card */}
        <Card>
          <CardHeader><CardTitle>Übersicht</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Rolle"><Badge variant="brand">{roleLabel}</Badge></Row>
            <Row label="Klasse">{user.schoolClass?.name ?? "—"}</Row>
            <Row label="2FA">
              <span className={user.twoFactor ? "font-medium text-success" : "text-muted-fg"}>
                {user.twoFactor ? "Aktiv" : "Nicht eingerichtet"}
              </span>
            </Row>
            <Row label="Zuletzt aktiv">
              {lastSeen
                ? lastSeen.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })
                : "Nie"}
            </Row>
            <Row label="Mitglied seit">
              {user.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
            </Row>
            {user.role === "student" && (
              <Row label="Abgaben">{user._count.studentSubmissions}</Row>
            )}
            {user.role === "teacher" && (
              <>
                <Row label="Noten eingetragen">{user._count.teacherGrades}</Row>
                <Row label="Aufgaben erstellt">{user._count.teacherAssignments}</Row>
              </>
            )}
          </CardBody>
        </Card>

        {/* Actions card */}
        <Card>
          <CardHeader><CardTitle>Verwaltung</CardTitle></CardHeader>
          <CardBody className="space-y-5">
            {/* Change role */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <UserCog className="size-3.5" /> Rolle ändern
              </p>
              <form action={updateUserRole.bind(null, id)} className="flex gap-2">
                <select
                  name="role"
                  defaultValue={user.role}
                  className="h-11 flex-1 border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" size="md">Speichern</Button>
              </form>
            </div>

            {/* Change class */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <Shield className="size-3.5" /> Klasse zuweisen
              </p>
              <form action={updateUserClass.bind(null, id)} className="flex gap-2">
                <select
                  name="classId"
                  defaultValue={user.classId ?? ""}
                  className="h-11 flex-1 border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Keine Klasse</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" size="md">Speichern</Button>
              </form>
            </div>

            {/* Schüler-Zusatzrollen (mehrfach kombinierbar) */}
            {user.role === "student" && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  <Shield className="size-3.5" /> Zusatzrollen
                </p>
                <form action={updateStudentFeatures.bind(null, id)} className="space-y-2 rounded-xl border border-border bg-bg p-3">
                  {STUDENT_FEATURES.map((f) => (
                    <label key={f.key} className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <input
                        type="checkbox" name="features" value={f.key}
                        defaultChecked={parseStudentFeatures((user as { studentFeatures?: string | null }).studentFeatures).includes(f.key)}
                        className="mt-0.5 size-4 accent-brand"
                      />
                      <span>
                        <span className="font-semibold">{f.icon} {f.label}</span>
                        <span className="block text-xs text-muted-fg">{f.description}</span>
                      </span>
                    </label>
                  ))}
                  <Button type="submit" variant="secondary" size="sm">Zusatzrollen speichern</Button>
                </form>
              </div>
            )}

            {/* Reset 2FA */}
            {user.twoFactor && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  <Key className="size-3.5" /> 2FA zurücksetzen
                </p>
                <form action={resetTwoFactor.bind(null, id)}>
                  <Button type="submit" variant="outline" size="sm">2FA deaktivieren</Button>
                </form>
              </div>
            )}

            {/* Password reset link */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <Mail className="size-3.5" /> Passwort
              </p>
              <Link
                href={`/admin/nutzer/einladen?prefill=${encodeURIComponent(user.email)}`}
                className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
              >
                Einladungs-E-Mail senden
              </Link>
            </div>

            {/* Delete */}
            {!isSelf && (
              <div className="space-y-1.5 border-t border-border pt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-danger">
                  <Trash2 className="size-3.5" /> Nutzer löschen
                </p>
                <form action={deleteUser.bind(null, id)}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="border-danger/40 text-danger hover:bg-danger/5"
                  >
                    Endgültig löschen
                  </Button>
                </form>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Parent → children links */}
      {user.role === "parent" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-muted-fg" strokeWidth={1.75} />
              Verknüpfte Kinder
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {user.parentLinks.length > 0 ? (
              <ul className="divide-y divide-border border border-border">
                {user.parentLinks.map((link) => (
                  <li key={link.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{link.student.name}</p>
                      <p className="text-xs text-muted-fg">{link.student.email}</p>
                    </div>
                    {link.student.schoolClass && (
                      <Badge variant="neutral">{link.student.schoolClass.name}</Badge>
                    )}
                    <Link href={`/admin/nutzer/${link.student.id}`} className="text-xs text-muted-fg hover:text-fg">
                      Profil →
                    </Link>
                    <form action={unlinkParentFromStudent.bind(null, id, link.id)}>
                      <button type="submit" title="Verknüpfung aufheben" className="text-muted-fg hover:text-danger">
                        <X className="size-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-fg">Noch keine Kinder verknüpft.</p>
            )}
            <form action={linkParentToStudent.bind(null, id)} className="flex gap-2">
              <Input
                type="email"
                name="studentEmail"
                required
                placeholder="E-Mail des Schülers"
                className="flex-1"
              />
              <Button type="submit" variant="secondary" size="md">Verknüpfen</Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Student → parent links */}
      {user.role === "student" && user.studentParents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-muted-fg" strokeWidth={1.75} />
              Verknüpfte Eltern
            </CardTitle>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {user.studentParents.map((link) => (
                <li key={link.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{link.parent.name}</p>
                    <p className="text-xs text-muted-fg">{link.parent.email}</p>
                  </div>
                  <Link href={`/admin/nutzer/${link.parent.id}`} className="text-xs text-muted-fg hover:text-fg">
                    Profil →
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Teaching */}
      {user.teacherSubjectClasses.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Unterrichtet</CardTitle></CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {user.teacherSubjectClasses.map((tsc, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: tsc.subject.color }} />
                  <span className="font-medium">{tsc.subject.name}</span>
                  <span className="text-muted-fg">· Klasse {tsc.class.name}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Sessions */}
      {user.sessions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Letzte Sitzungen</CardTitle></CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {user.sessions.map((s, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-fg">{s.userAgent ?? "Unbekannt"}</p>
                    {s.ipAddress && <p className="font-mono text-xs text-muted-fg">{s.ipAddress}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-fg">
                    {s.lastUsedAt.toLocaleDateString("de-DE", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-fg">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

