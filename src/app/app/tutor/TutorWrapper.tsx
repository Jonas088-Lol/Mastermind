"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TutorChat } from "./TutorChat";
import { TutorSidebar } from "./TutorSidebar";

interface RecentTopic {
  title: string;
  subject: string;
  time: string;
}

interface TutorWrapperProps {
  recentTopics: RecentTopic[];
  initialQuotaUsed: number;
  initialQuotaLimit: number;
  isAiConfigured: boolean;
}

export function TutorWrapper({
  recentTopics,
  initialQuotaUsed,
  initialQuotaLimit,
  isAiConfigured,
}: TutorWrapperProps) {
  // Use an object so the reference changes on every click, even for the same text.
  // This ensures TutorChat's useEffect fires each time.
  const [injectedPrompt, setInjectedPrompt] = useState<
    { text: string; seq: number } | undefined
  >(undefined);

  function handleSelect(text: string) {
    setInjectedPrompt((prev) => ({ text, seq: (prev?.seq ?? 0) + 1 }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <Card>
        <TutorChat
          initialQuotaUsed={initialQuotaUsed}
          initialQuotaLimit={initialQuotaLimit}
          isAiConfigured={isAiConfigured}
          injectedPrompt={injectedPrompt}
          onInjectedPromptConsumed={() => setInjectedPrompt(undefined)}
        />
      </Card>

      <aside className="flex flex-col gap-6">
        <TutorSidebar
          recentTopics={recentTopics}
          onSelect={handleSelect}
        />

        <Card>
          <div className="!p-4 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Quota
            </p>
            <p className="mt-2 font-mono text-2xl font-bold">
              {initialQuotaUsed}{" "}
              <span className="text-sm font-medium text-muted-fg">
                / {initialQuotaLimit}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-fg">
              KI-Anfragen diese Woche · Reset Mo 00:00
            </p>
            {!isAiConfigured && (
              <p className="mt-3 border-l-2 border-warning bg-warning/[0.06] px-3 py-2 text-[10px] uppercase tracking-wider text-warning">
                Mock-Modus · ANTHROPIC_API_KEY nicht gesetzt
              </p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
