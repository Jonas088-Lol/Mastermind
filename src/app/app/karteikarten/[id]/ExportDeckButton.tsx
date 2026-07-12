/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportCard = { front: string; back: string };

export function ExportDeckButton({ name, cards }: { name: string; cards: ExportCard[] }) {
  function handleExport() {
    const payload = {
      name,
      cards: cards.map((c) => ({ front: c.front, back: c.back })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    a.download = `${safeName || "deck"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-3.5" />
      Exportieren
    </Button>
  );
}
