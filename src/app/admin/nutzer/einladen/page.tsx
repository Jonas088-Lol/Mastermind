/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { inviteTeacher } from "./actions";
import { BulkInviteTeacherCard } from "./BulkInviteTeacherCard";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Lehrer einladen" };

export default async function LehrerEinladenPage() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "nutzer")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/nutzer" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Lehrer einladen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Der Lehrer erhält eine E-Mail mit einem Einladungslink und erstellt seinen Account selbst.
          </p>
        </div>
      </header>

      <form action={inviteTeacher} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Vollständiger Name</label>
          <input
            id="name" name="name" type="text" required
            placeholder="z. B. Dr. Maria Schmidt"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">Schul-E-Mail</label>
          <input
            id="email" name="email" type="email" required
            placeholder="vorname.nachname@schule.de"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="border border-border bg-surface p-4 text-sm text-muted-fg">
          <strong className="font-semibold text-fg">Was passiert nach der Einladung?</strong>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Lehrer erhält E-Mail mit persönlichem Link</li>
            <li>Lehrer klickt Link und legt Passwort fest</li>
            <li>Account ist sofort aktiv — du siehst ihn in der Nutzer-Liste</li>
          </ol>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90">
            Einladung senden
          </button>
          <Link href="/admin/nutzer" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
        </div>
      </form>

      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-fg">oder</span>
          <div className="flex-1 border-t border-border" />
        </div>
        <BulkInviteTeacherCard />
      </div>
    </div>
  );
}
