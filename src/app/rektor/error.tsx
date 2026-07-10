"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/app/ErrorScreen";

export default function RektorError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      title="Im Rektorat-Bereich ist etwas schiefgegangen."
      body="Wir konnten den Bereich gerade nicht laden. Versuch es erneut — Schul-Daten werden nicht beeinträchtigt."
      digest={error.digest}
      retry={unstable_retry}
      homeHref="/rektor"
    />
  );
}
