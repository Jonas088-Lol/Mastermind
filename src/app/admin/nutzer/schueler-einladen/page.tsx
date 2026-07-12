/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { effectiveRole, getSession } from "@/lib/session";
import { inviteStudent } from "./actions";
import { BulkInviteCard } from "./BulkInviteCard";

export const metadata: Metadata = { title: "Schüler einladen" };

export default async function SchuelerEinladenPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/nutzer" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Schüler einladen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Der Schüler erhält eine E-Mail mit einem Einladungslink und erstellt seinen Account selbst.
          </p>
        </div>
      </header>

      <form action={inviteStudent} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Vollständiger Name</label>
          <Input id="name" name="name" type="text" required placeholder="z. B. Lisa Müller" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">E-Mail-Adresse</label>
          <Input id="email" name="email" type="email" required placeholder="lisa@schule.de" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="klasse" className="text-sm font-semibold">
            Klasse <span className="font-normal text-muted-fg">(optional)</span>
          </label>
          <Input id="klasse" name="klasse" type="text" placeholder="z. B. 9b" />
        </div>

        <div className="border border-border bg-surface p-4 text-sm text-muted-fg">
          <strong className="font-semibold text-fg">Was passiert nach der Einladung?</strong>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Schüler erhält E-Mail mit persönlichem Link</li>
            <li>Schüler klickt Link und legt Passwort fest</li>
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
        <BulkInviteCard />
      </div>
    </div>
  );
}
