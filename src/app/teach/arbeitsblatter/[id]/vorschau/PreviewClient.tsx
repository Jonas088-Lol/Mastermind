"use client";

import { useState } from "react";
import {
  WorksheetPlayer,
  WorksheetAccessibilityToolbar,
} from "@/components/worksheet";
import type { WorksheetData, AccessibilitySettings } from "@/components/worksheet";

interface Props {
  worksheet: WorksheetData;
}

export function PreviewClient({ worksheet }: Props) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: "base",
    highContrast: false,
  });

  return (
    <div className="flex flex-col gap-0">
      {/* Preview banner */}
      <div className="flex items-center justify-center border-b border-warning/40 bg-warning/8 px-4 py-2 text-center text-sm text-warning">
        Vorschau-Modus — Antworten werden nicht gespeichert
      </div>

      {/* Accessibility toolbar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <WorksheetAccessibilityToolbar
          settings={settings}
          onChange={setSettings}
        />
      </div>

      <WorksheetPlayer
        worksheet={worksheet}
        mode="preview"
        existingAnswers={{}}
        onSubmit={async () => ({ ok: true })}
        fontSize={settings.fontSize}
        highContrast={settings.highContrast}
      />
    </div>
  );
}
