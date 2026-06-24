"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Entry {
  grade: string | number;
  label: string;
  minPercent: number;
}

interface Props {
  entries: Entry[];
  scaleName: string;
}

export function NotenschluesselRechner({ entries }: Props) {
  const [reached, setReached] = useState("");
  const [total, setTotal] = useState("");

  const reachedNum = parseFloat(reached);
  const totalNum = parseFloat(total);
  const percent = totalNum > 0 && !isNaN(reachedNum) ? (reachedNum / totalNum) * 100 : null;

  // Find matching grade — highest minPercent that is <= percent
  const grade =
    percent !== null
      ? entries
          .slice()
          .sort((a, b) => b.minPercent - a.minPercent)
          .find((e) => percent >= e.minPercent)
      : null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Rechner</CardTitle>
          <p className="mt-0.5 text-sm text-muted-fg">Punkte eingeben, Note ablesen</p>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reached" className="text-sm font-semibold">Erreichte Punkte</label>
            <Input
              id="reached"
              type="number"
              min={0}
              step={0.5}
              value={reached}
              onChange={(e) => setReached(e.target.value)}
              placeholder="z. B. 38"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="total" className="text-sm font-semibold">Gesamtpunkte</label>
            <Input
              id="total"
              type="number"
              min={1}
              step={0.5}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="z. B. 50"
            />
          </div>
        </div>

        {percent !== null && (
          <div
            className={`flex items-center justify-between rounded-xl p-5 ${
              String(grade?.grade) === "1" ? "bg-emerald-50 dark:bg-emerald-950/30" :
              String(grade?.grade) === "2" ? "bg-teal-50 dark:bg-teal-950/30" :
              String(grade?.grade) === "3" ? "bg-yellow-50 dark:bg-yellow-950/30" :
              String(grade?.grade) === "4" ? "bg-orange-50 dark:bg-orange-950/30" :
              "bg-red-50 dark:bg-red-950/30"
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Ergebnis</p>
              <p className="mt-1 text-5xl font-bold">
                {grade ? grade.grade : "—"}
              </p>
              <p className="mt-0.5 text-sm text-muted-fg">
                {grade?.label ?? "Kein passender Eintrag"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{percent.toFixed(1)} %</p>
              <p className="mt-0.5 text-sm text-muted-fg">
                {reached} / {total} Punkte
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
