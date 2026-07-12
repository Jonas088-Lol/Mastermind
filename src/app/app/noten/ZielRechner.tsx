/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export type ZielRechnerFach = {
  id: string;
  name: string;
  /** Notenwerte (1,0–6,0) des Fachs, einfaches arithmetisches Mittel */
  values: number[];
};

function fmt(n: number) {
  return n.toFixed(1).replace(".", ",");
}

const ZIELE = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

export default function ZielRechner({ faecher }: { faecher: ZielRechnerFach[] }) {
  const [fachId, setFachId] = useState(faecher[0]?.id ?? "");
  const [ziel, setZiel] = useState(2.0);

  const fach = useMemo(
    () => faecher.find((f) => f.id === fachId) ?? faecher[0],
    [faecher, fachId]
  );

  if (!fach || faecher.length === 0) return null;

  const n = fach.values.length;
  const sum = fach.values.reduce((s, v) => s + v, 0);
  const aktuell = n > 0 ? sum / n : 0;
  // Ziel-Schnitt über n+1 Noten: (sum + x) / (n + 1) <= ziel  →  x = ziel*(n+1) - sum
  const noetig = ziel * (n + 1) - sum;

  let meldung: { text: string; tone: string };
  if (n === 0) {
    meldung = {
      text: "Noch keine Noten in diesem Fach — jede Note ab " + fmt(ziel) + " bringt dich direkt ans Ziel.",
      tone: "text-muted-fg",
    };
  } else if (noetig < 1) {
    meldung = {
      text: `Mit einer einzigen Arbeit ist ein Schnitt von ${fmt(ziel)} leider nicht erreichbar — selbst eine 1,0 reicht rechnerisch nicht. Bleib dran, über mehrere Arbeiten ist es machbar!`,
      tone: "text-danger",
    };
  } else if (noetig > 6) {
    meldung = {
      text: `Entspann dich: Selbst mit einer 6,0 bleibst du besser als ${fmt(ziel)}. Dein Ziel ist schon sicher.`,
      tone: "text-success",
    };
  } else {
    meldung = {
      text: `Du brauchst in der nächsten Arbeit mindestens eine ${fmt(noetig)}, um auf einen Schnitt von ${fmt(ziel)} zu kommen.`,
      tone: noetig <= 2.5 ? "text-warning" : "text-success",
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-4 text-brand" strokeWidth={1.75} />
          Ziel-Noten-Rechner
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              Fach
            </span>
            <select
              value={fach.id}
              onChange={(e) => setFachId(e.target.value)}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand"
            >
              {faecher.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              Wunsch-Schnitt
            </span>
            <select
              value={String(ziel)}
              onChange={(e) => setZiel(Number(e.target.value))}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand"
            >
              {ZIELE.map((z) => (
                <option key={z} value={String(z)}>
                  {fmt(z)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-muted-fg">
            Aktueller Schnitt ({n} {n === 1 ? "Note" : "Noten"}, ungewichtet):{" "}
            <span className="font-mono font-bold text-fg">{n > 0 ? fmt(aktuell) : "—"}</span>
          </p>
          <p className={`mt-2 text-sm font-medium ${meldung.tone}`}>{meldung.text}</p>
        </div>

        <p className="text-[11px] text-muted-fg">
          Vereinfachte Rechnung: arithmetisches Mittel ohne Gewichtungen.
        </p>
      </CardBody>
    </Card>
  );
}
