/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_LABEL } from "@/lib/session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateStaffRole } from "./actions";

export const metadata: Metadata = { title: "Personal · Schulleitung" };

const ROLE_SECTIONS: { roles: string[]; label: string }[] = [
  { roles: ["teacher"], label: "Lehrkräfte" },
  { roles: ["rector", "vice_rector", "admin"], label: "Administration" },
  { roles: ["secretary"], label: "Sekretariat" },
];

const STAFF_ROLES = [
  { value: "teacher", label: "Lehrer" },
  { value: "vice_rector", label: "Stellv. Schulleiter" },
  { value: "rector", label: "Schulleiter" },
  { value: "admin", label: "Schul-Admin" },
  { value: "secretary", label: "Sekretariat" },
];

const ROLE_BADGE_VARIANT: Record<string, "neutral" | "brand" | "warning" | "info"> = {
  teacher: "neutral",
  rector: "brand",
  vice_rector: "brand",
  admin: "warning",
  secretary: "info",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PersonalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) {
    redirect("/login");
  }

  const staff = await prisma.user.findMany({
    where: {
      schoolId: session.schoolId ?? "",
      role: { in: ["teacher", "admin", "secretary", "rector", "vice_rector"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teacherSubjectClasses: {
        select: {
          subject: { select: { shortName: true, color: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const teacherCount = staff.filter((s) => s.role === "teacher").length;
  const adminCount = staff.filter((s) => ["rector", "vice_rector", "admin"].includes(s.role)).length;
  const secretaryCount = staff.filter((s) => s.role === "secretary").length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Personal</h1>
          <p className="mt-1 text-sm text-muted-fg">{staff.length} Mitarbeiter insgesamt</p>
        </div>
        <span title="Einladung wird per E-Mail versendet" className="cursor-not-allowed">
          <span
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "pointer-events-none gap-2 opacity-50"
            )}
            aria-disabled="true"
          >
            <UserPlus className="size-4" />
            Einladen
          </span>
        </span>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Gesamt", value: staff.length },
          { label: "Lehrkräfte", value: teacherCount },
          { label: "Administration", value: adminCount },
          { label: "Sekretariat", value: secretaryCount },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardBody className="py-4">
              <p className="font-mono text-2xl font-bold">{stat.value}</p>
              <p className="mt-0.5 text-xs text-muted-fg">{stat.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Sections by role group */}
      {ROLE_SECTIONS.map((section) => {
        const members = staff.filter((s) => section.roles.includes(s.role));
        if (members.length === 0) return null;
        return (
          <Card key={section.label}>
            <CardHeader>
              <CardTitle>{section.label}</CardTitle>
              <span className="text-xs text-muted-fg">{members.length} {members.length === 1 ? "Person" : "Personen"}</span>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="divide-y divide-border">
                {members.map((member) => {
                  const updateRole = updateStaffRole.bind(null, member.id);
                  return (
                    <div key={member.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                      {/* Avatar initials */}
                      <div className="flex size-9 shrink-0 items-center justify-center bg-surface-2 text-xs font-bold text-fg">
                        {initials(member.name)}
                      </div>

                      {/* Name + email */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="truncate text-xs text-muted-fg">{member.email}</p>
                      </div>

                      {/* Subject/class badges — teachers only */}
                      {member.role === "teacher" && member.teacherSubjectClasses.length > 0 && (
                        <div className="hidden min-w-0 flex-wrap gap-1 sm:flex">
                          {member.teacherSubjectClasses.slice(0, 4).map((tsc, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: tsc.subject.color }}
                              />
                              {tsc.subject.shortName}&nbsp;{tsc.class.name}
                            </span>
                          ))}
                          {member.teacherSubjectClasses.length > 4 && (
                            <span className="inline-flex items-center px-1 text-[10px] text-muted-fg">
                              +{member.teacherSubjectClasses.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Role badge */}
                      <Badge
                        variant={ROLE_BADGE_VARIANT[member.role] ?? "neutral"}
                        className="shrink-0"
                      >
                        {ROLE_LABEL[member.role as keyof typeof ROLE_LABEL] ?? member.role}
                      </Badge>

                      {/* Role-change form */}
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          const newRole = formData.get("role") as string;
                          await updateRole(newRole);
                        }}
                        className="flex shrink-0 items-center gap-1.5"
                      >
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="border border-border bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          {STAFF_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-7 px-2 text-xs"
                          )}
                        >
                          Ändern
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
