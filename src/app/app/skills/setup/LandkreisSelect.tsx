"use client";

import { useEffect, useState } from "react";

interface LK { id: string; name: string }

interface Props { bundeslandCode: string }

export function LandkreisSelect({ bundeslandCode }: Props) {
  const [lks, setLks] = useState<LK[]>([]);

  useEffect(() => {
    if (!bundeslandCode) return;
    fetch(`/api/landkreise?bundesland=${bundeslandCode}`)
      .then((r) => r.json())
      .then((data: LK[]) => setLks(data))
      .catch(() => setLks([]));
  }, [bundeslandCode]);

  return (
    <select
      name="landkreisId"
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
    >
      <option value="">— optional —</option>
      {lks.map((lk) => (
        <option key={lk.id} value={lk.id}>{lk.name}</option>
      ))}
    </select>
  );
}
