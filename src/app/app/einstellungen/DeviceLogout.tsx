/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logoutDevice } from "./actions";

export function DeviceLogoutButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => logoutDevice(sessionId))}
    >
      {isPending ? "..." : "Abmelden"}
    </Button>
  );
}
