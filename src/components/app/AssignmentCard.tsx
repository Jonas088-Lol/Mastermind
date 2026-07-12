/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import Link from "next/link";
import { X, CalendarClock, User, Award, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    dueAt: Date;
    maxPoints: number | null;
    coverEmoji: string | null;
    subject: { name: string; shortName: string; color: string };
    teacher: { name: string };
  };
  status: "open" | "submitted" | "graded" | "late";
  submittedAt?: Date | null;
  href: string;
}

const TYPE_LABEL: Record<string, string> = {
  homework: "Hausaufgabe",
  test: "Test / KA",
  project: "Projekt",
  exam: "Prüfung",
};

const DEFAULT_EMOJI: Record<string, string> = {
  homework: "📝",
  test: "✏️",
  project: "🔬",
  exam: "📋",
};

function formatDue(dueAt: Date): string {
  const now = new Date();
  const diff = Math.floor((dueAt.getTime() - now.getTime()) / 86_400_000);
  const dateStr = dueAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (diff < 0) return `Überfällig · ${dateStr}`;
  if (diff === 0) return `Heute · ${dateStr}`;
  if (diff === 1) return `Morgen · ${dateStr}`;
  if (diff <= 7) return `In ${diff} Tagen · ${dateStr}`;
  return dateStr;
}

export function AssignmentCard({ assignment, status, href }: AssignmentCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const emoji = assignment.coverEmoji ?? DEFAULT_EMOJI[assignment.type] ?? "📄";
  const color = assignment.subject.color;

  // Build a subtle gradient from the subject color
  const gradientStyle = {
    background: `linear-gradient(135deg, ${color}cc 0%, ${color}88 100%)`,
  };

  const isDone = status === "submitted" || status === "graded";

  return (
    <>
      {/* Card */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          status === "late" && "border-danger/40 bg-danger/4"
        )}
      >
        {/* Colored header */}
        <div
          className="relative flex h-20 items-center justify-center"
          style={gradientStyle}
        >
          <span className="text-4xl drop-shadow-sm select-none">{emoji}</span>

          {/* Status indicator dot */}
          <span
            className={cn(
              "absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white/60",
              status === "open" && "bg-amber-400",
              status === "submitted" && "bg-sky-400",
              status === "graded" && "bg-emerald-400",
              status === "late" && "bg-red-500"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none"
              style={{ backgroundColor: color + "22", color }}
            >
              {assignment.subject.shortName}
            </span>
            <Badge variant="outline" className="text-[11px]!">
              {TYPE_LABEL[assignment.type] ?? assignment.type}
            </Badge>
          </div>

          {/* Title */}
          <p
            className={cn(
              "line-clamp-2 text-sm font-semibold leading-snug",
              isDone && "text-muted-fg line-through"
            )}
          >
            {assignment.title}
          </p>

          {/* Meta */}
          <div className="mt-auto flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-fg">
              <CalendarClock className="size-3 shrink-0" />
              {formatDue(assignment.dueAt)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-fg">
              <User className="size-3 shrink-0" />
              {assignment.teacher.name}
            </span>
          </div>

          {/* Status badge */}
          <div className="pt-0.5">
            {status === "open" && (
              <Badge variant="warning" className="text-[11px]!">Offen</Badge>
            )}
            {status === "submitted" && (
              <Badge variant="info" className="text-[11px]!">Abgegeben</Badge>
            )}
            {status === "graded" && (
              <Badge variant="success" className="text-[11px]!">Bewertet</Badge>
            )}
            {status === "late" && (
              <Badge variant="danger" className="text-[11px]!">Verspätet</Badge>
            )}
          </div>
        </div>
      </button>

      {/* Modal / dialog */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl">
            {/* Modal colored header */}
            <div
              className="relative flex h-28 items-center justify-center"
              style={gradientStyle}
            >
              <span className="text-5xl drop-shadow-sm select-none">{emoji}</span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-3 right-3 grid size-8 place-items-center rounded-xl bg-black/20 text-white/80 transition-colors hover:bg-black/35 hover:text-white"
                aria-label="Schließen"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-4 p-5">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
                  style={{ backgroundColor: color + "22", color }}
                >
                  {assignment.subject.name}
                </span>
                <Badge variant="outline">
                  {TYPE_LABEL[assignment.type] ?? assignment.type}
                </Badge>
                {status === "open" && <Badge variant="warning">Offen</Badge>}
                {status === "submitted" && <Badge variant="info">Abgegeben</Badge>}
                {status === "graded" && <Badge variant="success">Bewertet</Badge>}
                {status === "late" && <Badge variant="danger">Verspätet</Badge>}
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold leading-snug">{assignment.title}</h2>

              {/* Description */}
              {assignment.description ? (
                <p className="text-sm leading-relaxed text-muted-fg whitespace-pre-wrap">
                  {assignment.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-fg">Keine Beschreibung vorhanden.</p>
              )}

              {/* Meta grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Lehrer
                  </dt>
                  <dd className="mt-0.5 font-medium">{assignment.teacher.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Fällig
                  </dt>
                  <dd className="mt-0.5 font-medium">{formatDue(assignment.dueAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Typ
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {TYPE_LABEL[assignment.type] ?? assignment.type}
                  </dd>
                </div>
                {assignment.maxPoints != null && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                      Max. Punkte
                    </dt>
                    <dd className="mt-0.5 flex items-center gap-1 font-medium">
                      <Award className="size-3.5 text-amber-500" />
                      {assignment.maxPoints}
                    </dd>
                  </div>
                )}
              </dl>

              {/* CTA */}
              <Link
                href={href}
                className="flex items-center justify-center gap-2 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/85"
              >
                <ExternalLink className="size-4" />
                Aufgabe öffnen
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
