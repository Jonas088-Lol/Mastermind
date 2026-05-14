import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAiConfigured } from "@/lib/ai";
import { getAiQuota } from "@/lib/db/store";
import { getSession, ROLE_HOME, effectiveRole } from "@/lib/session";
import { TutorWrapper } from "./TutorWrapper";

export const metadata: Metadata = { title: "KI-Tutor" };

export default async function TutorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = effectiveRole(session);
  if (role !== "student" && role !== "super") {
    redirect(ROLE_HOME[role]);
  }

  const quota = await getAiQuota(session.email);
  const aiOn = isAiConfigured();

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            KI-Tutor · MasterMind v3
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Wobei kann ich dir helfen?
        </h1>
        <p className="text-sm text-muted-fg">
          Erklärt Schritt für Schritt · gibt nie die Lösung weg, sondern führt
          dich hin · DSGVO-konform · Pseudonymisierung vor jeder KI-Anfrage
        </p>
      </header>

      <TutorWrapper
        recentTopics={[]}
        initialQuotaUsed={quota.used}
        initialQuotaLimit={quota.limit}
        isAiConfigured={aiOn}
      />
    </div>
  );
}
