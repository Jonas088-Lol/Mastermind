/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { NeueKlasseForm } from "./NeueKlasseForm";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Klasse erstellen" };

export default async function NeueKlassePage() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "klassen")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/klassen" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Neue Klasse</h1>
        </div>
      </header>

      <NeueKlasseForm />
    </div>
  );
}
