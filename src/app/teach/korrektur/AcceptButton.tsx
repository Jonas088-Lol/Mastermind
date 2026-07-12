/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptSubmission } from "./submission-actions";

export function AcceptButton({
  submissionId,
  grade,
}: {
  submissionId: string;
  grade: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      className="flex-1 lg:flex-none"
      disabled={isPending}
      onClick={() =>
        startTransition(() => acceptSubmission(submissionId, grade))
      }
    >
      <Check className="size-3.5" />
      {isPending ? "…" : "Annehmen"}
    </Button>
  );
}
