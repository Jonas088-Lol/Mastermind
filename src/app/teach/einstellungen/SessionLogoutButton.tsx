"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logoutSession } from "./actions";

export function SessionLogoutButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => logoutSession(sessionId))}
    >
      Abmelden
    </Button>
  );
}
