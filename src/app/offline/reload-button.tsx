/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReloadButton() {
  return (
    <Button
      type="button"
      size="md"
      className="flex-1"
      onClick={() => {
        if (typeof window !== "undefined") window.location.reload();
      }}
    >
      <RefreshCw className="size-4" />
      Neu laden
    </Button>
  );
}
