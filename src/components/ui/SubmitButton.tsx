/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useFormStatus } from "react-dom";
import { type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  /** Text während des Absendens (Default: "…"). */
  pendingText?: string;
};

/**
 * Submit-Button für Server-Action-Formulare. Deaktiviert sich automatisch,
 * solange die Action läuft (verhindert Doppel-Klick / Doppel-Anlage).
 * Muss innerhalb eines <form action={…}> stehen.
 */
export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (pendingText ?? "…") : children}
    </Button>
  );
}
