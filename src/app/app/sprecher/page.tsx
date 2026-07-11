import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { SprecherForm } from "./SprecherForm";

export const metadata: Metadata = { title: "Sprecher | MasterMind" };

export default async function SprecherPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/app");

  const features = await getStudentFeatures(session.userId);
  const canSchool = features.includes("schuelersprecher");
  const canClass = features.includes("klassensprecher");
  if (!canSchool && !canClass) redirect("/app");

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { schoolClass: { select: { name: true } } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          {canSchool ? "Schülersprecher" : "Klassensprecher"}
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <Megaphone className="size-7 text-brand" /> Nachricht senden
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Deine Nachricht erscheint bei den Empfängern als Benachrichtigung — mit deinem Namen als Absender.
        </p>
      </header>

      <SprecherForm canSchool={canSchool} canClass={canClass} className={me?.schoolClass?.name ?? null} />
    </div>
  );
}
