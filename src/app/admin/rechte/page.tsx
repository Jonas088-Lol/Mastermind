/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, GraduationCap, Users } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import {
  CAPABILITIES,
  getPermissionOverrides,
  resolveCapability,
  type CapabilityDef,
} from "@/lib/permissions";
import { saveRolePermissions } from "./actions";

export const metadata: Metadata = { title: "Rechte · Schulverwaltung" };

const ROLE_META = {
  teacher: { label: "Lehrkräfte", icon: GraduationCap },
  student: { label: "Schüler", icon: Users },
} as const;

export default async function AdminRechtePage() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "rechte")) redirect("/admin");

  const overrides = await getPermissionOverrides(session.schoolId);

  // Nach Rolle und innerhalb der Rolle nach Gruppe bündeln.
  const byRole = new Map<string, Map<string, CapabilityDef[]>>();
  for (const cap of CAPABILITIES) {
    if (!byRole.has(cap.role)) byRole.set(cap.role, new Map());
    const groups = byRole.get(cap.role)!;
    if (!groups.has(cap.group)) groups.set(cap.group, []);
    groups.get(cap.group)!.push(cap);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Schulverwaltung
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Rechte</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Lege fest, welche Funktionen Lehrkräfte und Schüler an eurer Schule nutzen
          dürfen. Deaktivierte Funktionen sind für die jeweilige Rolle gesperrt —
          auch beim direkten Aufruf der Adresse.
        </p>
      </header>

      <form action={saveRolePermissions} className="flex flex-col gap-6">
        {(["teacher", "student"] as const).map((role) => {
          const groups = byRole.get(role);
          if (!groups) return null;
          const meta = ROLE_META[role];
          const Icon = meta.icon;

          return (
            <Card key={role}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                    <Icon className="size-4.5" strokeWidth={1.75} />
                  </span>
                  <CardTitle>{meta.label}</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                {[...groups.entries()].map(([group, caps]) => (
                  <div key={group} className="border-t border-border">
                    <p className="bg-surface px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
                      {group}
                    </p>
                    <ul className="divide-y divide-border">
                      {caps.map((cap) => {
                        const enabled = resolveCapability(cap.id, role, overrides);
                        const changed = enabled !== cap.default;
                        return (
                          <li key={cap.id} className="flex items-start gap-3 px-5 py-3">
                            <input
                              type="checkbox"
                              id={cap.id}
                              name={cap.id}
                              defaultChecked={enabled}
                              className="mt-0.5 size-4 shrink-0 accent-brand"
                            />
                            <label htmlFor={cap.id} className="min-w-0 flex-1 cursor-pointer">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">{cap.label}</span>
                                {changed && <Badge variant="warning">geändert</Badge>}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-fg">
                                {cap.description}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </CardBody>
            </Card>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
          >
            <Check className="size-4" />
            Rechte speichern
          </button>
          <p className="text-xs text-muted-fg">
            Es wird nur gespeichert, was vom Standard abweicht — neue Funktionen
            starten daher automatisch mit sinnvollen Vorgaben.
          </p>
        </div>
      </form>
    </div>
  );
}
