/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { saveFeatureSettings } from "./actions";

export interface FeatureDef {
  key: string;
  label: string;
  desc: string;
}

interface ParsedFeatureSettings {
  disabled: string[];
  windows: Record<string, { from: string; to: string }>;
}

interface Props {
  features: FeatureDef[];
  settings: ParsedFeatureSettings;
}

export function FeatureSettingsForm({ features, settings }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const f of features) {
      map[f.key] = !settings.disabled.includes(f.key);
    }
    return map;
  });

  const [windows, setWindows] = useState<Record<string, { from: string; to: string }>>(() => {
    return { ...settings.windows };
  });

  function toggleFeature(key: string) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addWindow(key: string) {
    setWindows((prev) => ({ ...prev, [key]: { from: "08:00", to: "16:00" } }));
  }

  function removeWindow(key: string) {
    setWindows((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateWindow(key: string, field: "from" | "to", value: string) {
    setWindows((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  return (
    <form action={saveFeatureSettings}>
      <div className="divide-y divide-border border border-border">
        {features.map((f) => {
          const isEnabled = enabled[f.key] ?? true;
          const win = windows[f.key];
          return (
            <div key={f.key} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="mt-0.5 text-xs text-muted-fg">{f.desc}</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-muted-fg">
                    {isEnabled ? "Aktiv" : "Deaktiviert"}
                  </span>
                  <input
                    type="checkbox"
                    name={`feature_${f.key}`}
                    checked={isEnabled}
                    onChange={() => toggleFeature(f.key)}
                    value="on"
                    className="size-4 cursor-pointer accent-brand"
                  />
                </label>
              </div>

              {isEnabled && (
                <div className="mt-3">
                  {win ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-muted-fg">Nur sichtbar von</span>
                      <input
                        type="time"
                        name={`window_${f.key}_from`}
                        value={win.from}
                        onChange={(e) => updateWindow(f.key, "from", e.target.value)}
                        className="h-8 border border-border bg-bg px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                      <span className="text-xs text-muted-fg">bis</span>
                      <input
                        type="time"
                        name={`window_${f.key}_to`}
                        value={win.to}
                        onChange={(e) => updateWindow(f.key, "to", e.target.value)}
                        className="h-8 border border-border bg-bg px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(f.key)}
                        className="text-xs text-danger hover:underline"
                      >
                        Zeitfenster entfernen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addWindow(f.key)}
                      className="text-xs text-brand hover:underline"
                    >
                      + Zeitfenster hinzufügen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="bg-fg px-6 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90 transition-colors"
        >
          Einstellungen speichern
        </button>
      </div>
    </form>
  );
}
