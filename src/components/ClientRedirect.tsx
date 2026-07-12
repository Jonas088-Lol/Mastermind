/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return null;
}
