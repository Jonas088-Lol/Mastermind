/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { registerNewStudent } from "./actions";

export const metadata: Metadata = { title: "Neuanmeldung · Sekretariat" };

export default async function NeuanmeldungPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: session.schoolId! },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Neue Schüleranmeldung</h1>
        <p className="mt-1 text-sm text-muted-fg">Schüler erfassen und dem System hinzufügen</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Schülerdaten</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={registerNewStudent} className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-danger">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Vorname Nachname"
                className="border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-fg focus:border-fg"
              />
            </div>

            {/* E-Mail */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                E-Mail <span className="text-danger">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="schueler@schule.de"
                className="border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-fg focus:border-fg"
              />
            </div>

            {/* Klasse */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="classId" className="text-sm font-medium">
                Klasse
              </label>
              {classes.length > 0 ? (
                <select
                  id="classId"
                  name="classId"
                  className="border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-fg"
                >
                  <option value="">— Keine Klasse —</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Jahrgang {cls.grade})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-fg">
                    Noch keine Klassen angelegt.{" "}
                    <Link href="/sekretariat/klassen" className="underline">
                      Klassen verwalten
                    </Link>
                  </p>
                  <input
                    id="klasse"
                    name="klasse"
                    type="text"
                    placeholder='z. B. "9b"'
                    className="border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-fg focus:border-fg"
                  />
                </div>
              )}
              {classes.length > 0 && (
                <input type="hidden" name="klasse" value="" />
              )}
            </div>

            {/* Eltern-E-Mail */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="parentEmail" className="text-sm font-medium">
                Eltern-E-Mail{" "}
                <span className="text-xs font-normal text-muted-fg">(optional)</span>
              </label>
              <input
                id="parentEmail"
                name="parentEmail"
                type="email"
                autoComplete="off"
                placeholder="eltern@beispiel.de"
                className="border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-fg focus:border-fg"
              />
              <p className="text-xs text-muted-fg">
                Wird automatisch mit dem Schüler verknüpft, wenn ein Elternteil-Konto mit dieser Adresse vorhanden ist.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className={buttonVariants({ variant: "primary" })}
              >
                Schüler anmelden
              </button>
              <Link
                href="/sekretariat/schueler"
                className={buttonVariants({ variant: "ghost" })}
              >
                Abbrechen
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
