/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/app/ErrorScreen";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <ErrorScreen
      title="Ein unerwarteter Fehler ist aufgetreten."
      body="Wir konnten die Seite nicht laden. Bitte versuche es erneut, oder kehre zur Startseite zurück."
      digest={error.digest}
      retry={unstable_retry}
    />
  );
}
