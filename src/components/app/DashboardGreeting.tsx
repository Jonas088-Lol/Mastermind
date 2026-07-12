/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Guten Morgen";
  if (hour >= 12 && hour < 17) return "Guten Tag";
  if (hour >= 17 && hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

export function DashboardGreeting({ firstName }: { firstName: string }) {
  // Stunde erst NACH dem Mount lesen — new Date() im Render nutzt auf dem
  // Server dessen Zeitzone (meist UTC) und erzeugt einen Hydration-Mismatch.
  const [greeting, setGreeting] = useState("Hallo");
  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
      {greeting}, {firstName} 👋
    </h1>
  );
}
