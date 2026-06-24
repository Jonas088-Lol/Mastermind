"use client";

export function DashboardGreeting({ firstName }: { firstName: string }) {
  const hour = new Date().getHours();

  let greeting: string;
  if (hour >= 5 && hour < 12)       greeting = "Guten Morgen";
  else if (hour >= 12 && hour < 17) greeting = "Guten Tag";
  else if (hour >= 17 && hour < 22) greeting = "Guten Abend";
  else                               greeting = "Gute Nacht";

  return (
    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
      {greeting}, {firstName} 👋
    </h1>
  );
}
