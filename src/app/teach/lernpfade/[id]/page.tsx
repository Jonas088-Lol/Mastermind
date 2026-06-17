import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import {
  addModule,
  addQuestion,
  deleteModule,
  deleteQuestion,
  recommendToClass,
  updateLearningPath,
} from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.learningPath.findUnique({ where: { id }, select: { title: true } });
  return { title: p ? `${p.title} · Lernpfade` : "Lernpfad" };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LernpfadDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const path = await prisma.learningPath.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, color: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          questions: { orderBy: { order: "asc" } },
          progress: { select: { userId: true } },
        },
      },
      progress: { select: { userId: true }, distinct: ["userId"] },
    },
  });

  if (!path || path.createdById !== session.userId) notFound();

  const totalModules = path.modules.length;
  const uniqueStudents = path.progress.length;

  const teacherClasses = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: { class: { select: { id: true, name: true } } },
    distinct: ["classId"],
  });
  const classes = teacherClasses.map((t) => t.class);

  const updateWithId = updateLearningPath.bind(null, id);
  const addModuleWithId = addModule.bind(null, id);
  const recommendWithId = recommendToClass.bind(null, id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-start gap-4">
        <Link
          href="/teach/lernpfade"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{path.title}</h1>
            <span
              className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: path.subject.color + "22",
                color: path.subject.color,
              }}
            >
              {path.subject.name}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-fg">
            {totalModules} Module · {uniqueStudents} Schüler aktiv
          </p>
        </div>
      </header>

      {/* ── Edit metadata ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Pfad bearbeiten</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={updateWithId} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="path-title">Titel *</Label>
              <Input id="path-title" name="title" defaultValue={path.title} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="path-desc">Beschreibung</Label>
              <textarea
                id="path-desc"
                name="description"
                rows={2}
                defaultValue={path.description ?? ""}
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              />
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Speichern
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── Module list ──────────────────────────────────────── */}
      {path.modules.map((mod) => {
        const completions = mod.progress.length;
        const addQuestionWithIds = addQuestion.bind(null, id, mod.id);
        const deleteModuleWithIds = deleteModule.bind(null, id, mod.id);
        const pct = uniqueStudents > 0 ? Math.round((completions / uniqueStudents) * 100) : 0;

        return (
          <Card key={mod.id}>
            <CardHeader>
              <div className="flex flex-1 flex-col">
                <CardTitle>{mod.title}</CardTitle>
                <p className="mt-0.5 text-xs text-muted-fg">
                  {mod.questions.length} Fragen · {completions}/{uniqueStudents} Schüler abgeschlossen
                </p>
                {uniqueStudents > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={pct} className="h-1 w-32" />
                    <span className="text-xs text-muted-fg">{pct}%</span>
                  </div>
                )}
              </div>
              <form action={deleteModuleWithIds}>
                <button
                  type="submit"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  aria-label="Modul löschen"
                >
                  <Trash2 className="size-3.5 text-danger" />
                </button>
              </form>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {mod.questions.length > 0 && (
                <ul className="divide-y divide-border border-t border-border">
                  {mod.questions.map((q) => {
                    let options: string[] = [];
                    try { options = JSON.parse(q.options) as string[]; } catch { /* empty */ }
                    const deleteQ = deleteQuestion.bind(null, id, q.id);
                    return (
                      <li key={q.id} className="flex items-start gap-4 px-5 py-3.5">
                        <span className="mt-0.5 font-mono text-xs text-muted-fg">{q.order}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{q.question}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {options.map((o, i) => (
                              <Badge
                                key={i}
                                variant={String(i) === q.correct ? "success" : "neutral"}
                              >
                                {String.fromCharCode(65 + i)}. {o}
                              </Badge>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="mt-1 text-xs text-muted-fg italic">{q.explanation}</p>
                          )}
                        </div>
                        <form action={deleteQ}>
                          <button
                            type="submit"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                            aria-label="Frage löschen"
                          >
                            <Trash2 className="size-3.5 text-danger" />
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
              {/* Add question form */}
              <details className="group border-t border-border">
                <summary className="flex cursor-pointer select-none items-center gap-2 px-5 py-3 text-sm font-semibold text-muted-fg hover:text-fg">
                  <Plus className="size-3.5" />
                  Frage hinzufügen
                </summary>
                <form action={addQuestionWithIds} className="flex flex-col gap-3 border-t border-border px-5 pb-5 pt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`q-${mod.id}-question`}>Frage *</Label>
                    <Input id={`q-${mod.id}-question`} name="question" required placeholder="Fragetext …" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["A", "B", "C", "D"].map((letter, i) => (
                      <div key={letter} className="flex flex-col gap-1.5">
                        <Label htmlFor={`q-${mod.id}-opt${letter}`}>
                          Option {letter}{i < 2 ? " *" : ""}
                        </Label>
                        <Input
                          id={`q-${mod.id}-opt${letter}`}
                          name={`opt${letter}`}
                          required={i < 2}
                          placeholder={`Option ${letter} …`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`q-${mod.id}-correct`}>Richtige Antwort</Label>
                    <select
                      id={`q-${mod.id}-correct`}
                      name="correct"
                      className="h-10 w-full border border-border bg-bg px-3 text-sm text-fg outline-none focus-visible:border-brand"
                    >
                      {["A", "B", "C", "D"].map((l, i) => (
                        <option key={l} value={i}>Option {l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`q-${mod.id}-exp`}>Erklärung (optional)</Label>
                    <Input id={`q-${mod.id}-exp`} name="explanation" placeholder="Warum ist das richtig?" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className={buttonVariants({ size: "sm" })}>
                      Frage speichern
                    </button>
                  </div>
                </form>
              </details>
            </CardBody>
          </Card>
        );
      })}

      {/* ── Add module ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Modul hinzufügen</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={addModuleWithId} className="flex gap-3">
            <Input name="title" required placeholder="Modul-Titel …" className="flex-1" />
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-3.5" />
              Hinzufügen
            </button>
          </form>
        </CardBody>
      </Card>

      {/* ── Recommend to class ───────────────────────────────── */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="size-4 text-muted-fg" strokeWidth={1.75} />
              <CardTitle>An Klasse empfehlen</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-sm text-muted-fg">
              Schüler erhalten eine Push-Benachrichtigung mit dem Link zu diesem Lernpfad.
            </p>
            <form action={recommendWithId} className="flex gap-3">
              <select
                name="classId"
                required
                className="h-10 flex-1 border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Klasse wählen…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="submit" className={buttonVariants({ size: "sm" })}>
                <Send className="size-3.5" />
                Empfehlen
              </button>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
