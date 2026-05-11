"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/app/ErrorScreen";

export default function AppError({
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
      title="In deiner Schüler-App ist etwas schiefgegangen."
      body="Wir konnten den Bereich gerade nicht laden. Versuch es nochmal — oder geh zurück zum Dashboard."
      digest={error.digest}
      retry={unstable_retry}
      homeHref="/app"
    />
  );
}
