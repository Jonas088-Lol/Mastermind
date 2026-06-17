"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

interface StudentProgress {
  studentId: string;
  studentName: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
}

export default function WorksheetLivePage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [worksheetTitle, setWorksheetTitle] = useState("");

  useEffect(() => {
    const es = new EventSource(`/api/worksheets/${assignmentId}/progress`);

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as {
          submissions: StudentProgress[];
          totalStudents: number;
          worksheetTitle: string;
        };
        setProgress(data.submissions);
        setTotalStudents(data.totalStudents);
        setWorksheetTitle(data.worksheetTitle);
        setLastUpdate(new Date());
      } catch {}
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [assignmentId]);

  const submitted = progress.filter((p) => p.status === "submitted" || p.status === "graded");
  const inProgress = progress.filter((p) => p.status === "in_progress");
  const notStarted = totalStudents - progress.length;

  const avgScore = submitted.length > 0 && submitted[0].maxScore
    ? Math.round(
        submitted.reduce((s, p) => s + ((p.score ?? 0) / (p.maxScore ?? 1)), 0) /
        submitted.length * 100
      )
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <header className="flex items-center gap-3">
        <Link href={`/teach/arbeitsblatter/${assignmentId}`} className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-fg">Live-Überwachung</p>
          <h1 className="mt-0.5 text-2xl font-bold">{worksheetTitle || "Arbeitsblatt"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-danger"}`} />
          <span className="text-xs text-muted-fg">{connected ? "Live" : "Getrennt"}</span>
          {lastUpdate && (
            <span className="ml-2 flex items-center gap-1 text-xs text-muted-fg">
              <RefreshCw className="size-3" />
              {lastUpdate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
        <StatCard label="Schüler gesamt" value={totalStudents} icon={Users} />
        <StatCard label="Abgegeben" value={submitted.length} icon={CheckCircle2} tone="text-success" />
        <StatCard label="In Bearbeitung" value={inProgress.length} icon={Clock} tone="text-warning" />
        <StatCard
          label="Ø Ergebnis"
          value={avgScore !== null ? `${avgScore}%` : "—"}
          icon={CheckCircle2}
          tone={avgScore !== null && avgScore >= 60 ? "text-success" : "text-warning"}
        />
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-fg">
          <span>Fortschritt</span>
          <span>{submitted.length} / {totalStudents}</span>
        </div>
        <div className="h-3 border border-border bg-surface">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: totalStudents > 0 ? `${(submitted.length / totalStudents) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Student list */}
      <Card>
        <CardHeader>
          <CardTitle>Schüler · {totalStudents}</CardTitle>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {progress.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">
              Noch kein Schüler hat begonnen.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {progress.map((p) => (
                <li key={p.studentId} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.studentName}</p>
                    {p.startedAt && (
                      <p className="text-xs text-muted-fg">
                        Begonnen {new Date(p.startedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {p.submittedAt && (
                          <> · Abgegeben {new Date(p.submittedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === "submitted" || p.status === "graded" ? (
                      <>
                        {p.score !== null && p.maxScore !== null && (
                          <span className="font-mono text-sm font-bold">
                            {p.score}/{p.maxScore}
                          </span>
                        )}
                        <Badge variant="success">Abgegeben</Badge>
                      </>
                    ) : p.status === "in_progress" ? (
                      <Badge variant="warning">In Bearbeitung</Badge>
                    ) : (
                      <Badge>Unbekannt</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {notStarted > 0 && (
            <p className="border-t border-border px-5 py-3 text-xs text-muted-fg">
              + {notStarted} Schüler haben noch nicht begonnen
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "text-fg",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-bg p-5">
      <div className="flex items-center gap-1.5">
        <Icon className={`size-3.5 ${tone}`} strokeWidth={1.75} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
      </div>
      <p className={`font-mono text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
