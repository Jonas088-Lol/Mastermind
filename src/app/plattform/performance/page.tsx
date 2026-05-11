import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Database, Server, Zap } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Performance · Plattform" };

const METRICS = [
  { label: "API p50", value: "8ms", sub: "Median", good: true },
  { label: "API p95", value: "42ms", sub: "95. Perzentil", good: true },
  { label: "API p99", value: "120ms", sub: "99. Perzentil", good: true },
  { label: "DB p95", value: "12ms", sub: "Frankfurt · Postgres", good: true },
];

const ENDPOINTS = [
  { path: "GET /api/timetable", p50: 6, p95: 28, calls: 18420 },
  { path: "GET /api/grades", p50: 9, p95: 44, calls: 12310 },
  { path: "POST /api/messages", p50: 22, p95: 88, calls: 5480 },
  { path: "GET /api/assignments", p50: 11, p95: 51, calls: 9870 },
  { path: "POST /api/submissions", p50: 35, p95: 142, calls: 2310 },
];

export default async function PlattformPerformancePage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Performance</h1>
        <p className="mt-1 text-sm text-muted-fg">Echtzeit-Latenzen und Durchsatz — letzte 24 Stunden.</p>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{m.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{m.value}</p>
            <p className="mt-1 text-xs text-muted-fg">{m.sub}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Langsamste Endpoints</CardTitle>
              <span className="font-mono text-xs text-muted-fg">p95 · 24h</span>
            </CardHeader>
            <CardBody className="!px-0 !pb-0">
              <ul className="divide-y divide-border border-t border-border">
                {ENDPOINTS.sort((a, b) => b.p95 - a.p95).map((e) => (
                  <li key={e.path} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-mono text-xs">{e.path}</span>
                      <span className="font-mono font-bold">{e.p95}ms</span>
                    </div>
                    <Progress value={Math.min(100, (e.p95 / 150) * 100)} tone={e.p95 > 100 ? "warning" : "brand"} className="mt-1.5" />
                    <p className="mt-0.5 text-[10px] text-muted-fg">{e.calls.toLocaleString("de-DE")} Aufrufe · p50 {e.p50}ms</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Infrastruktur</CardTitle></CardHeader>
            <CardBody>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Server className="size-4 text-success" />
                  <div>
                    <p className="font-semibold">App · Frankfurt</p>
                    <p className="text-xs text-muted-fg">3 Instanzen · CPU 12%</p>
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <Database className="size-4 text-success" />
                  <div>
                    <p className="font-semibold">PostgreSQL · Frankfurt</p>
                    <p className="text-xs text-muted-fg">Connections: 18/100 · 4,7 GB</p>
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="size-4 text-brand" />
                  <div>
                    <p className="font-semibold">Redis Cache</p>
                    <p className="text-xs text-muted-fg">Hit-Rate 94% · 280 MB</p>
                  </div>
                </li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Uptime · 30 Tage</CardTitle></CardHeader>
            <CardBody>
              <p className="font-mono text-3xl font-bold text-success">99,98%</p>
              <p className="mt-1 text-xs text-muted-fg">Letzter Vorfall: vor 47 Tagen</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
