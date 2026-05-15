import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import {
  assignWorksheet,
  deleteAssignment,
  deleteWorksheet,
  deleteWorksheetItem,
  publishWorksheet,
  saveWorksheetItem,
  updateWorksheet,
} from "../actions";

export const metadata: Metadata = { title: "Arbeitsblatt bearbeiten" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const ITEM_TYPES = [
  "text_input",
  "fill_blank",
  "multiple_choice",
  "true_false",
  "drag_drop",
  "matching",
  "sorting",
  "drawing",
  "number_wall",
  "number_line",
  "calculation_wheel",
  "hundred_chart",
] as const;

const ITEM_TYPE_LABEL: Record<string, string> = {
  text_input: "Texteingabe",
  fill_blank: "Lückentext",
  multiple_choice: "Multiple Choice",
  true_false: "Wahr / Falsch",
  drag_drop: "Drag & Drop",
  matching: "Zuordnung",
  sorting: "Sortierung",
  drawing: "Zeichnung",
  number_wall: "Zahlenmauer",
  number_line: "Zahlenstrahl",
  calculation_wheel: "Rechenrad",
  hundred_chart: "Hunderterfeld",
};

const CONFIG_EXAMPLES: Record<string, string> = {
  text_input: JSON.stringify({ label: "Erkläre in eigenen Worten:", multiline: true, maxLength: 500 }, null, 2),
  fill_blank: JSON.stringify({ text: "Die Hauptstadt von Deutschland ist {{blank:0}}.", blanks: [{ id: "0" }] }, null, 2),
  multiple_choice: JSON.stringify({ question: "Welche Antwort ist richtig?", options: ["Antwort A", "Antwort B", "Antwort C", "Antwort D"] }, null, 2),
  true_false: JSON.stringify({ question: "Die Erde ist eine Scheibe." }, null, 2),
  drag_drop: JSON.stringify({ instruction: "Ordne zu:", items: [{ id: "a", label: "Hund" }, { id: "b", label: "Katze" }, { id: "c", label: "Adler" }], zones: [{ id: "z1", label: "Säugetier" }, { id: "z2", label: "Vogel" }] }, null, 2),
  matching: JSON.stringify({ instruction: "Verbinde:", leftItems: [{ id: "l1", label: "Berlin" }, { id: "l2", label: "Paris" }], rightItems: [{ id: "r1", label: "Frankreich" }, { id: "r2", label: "Deutschland" }] }, null, 2),
  sorting: JSON.stringify({ instruction: "Sortiere:", items: [{ id: "1", label: "Frühling" }, { id: "2", label: "Sommer" }, { id: "3", label: "Herbst" }, { id: "4", label: "Winter" }] }, null, 2),
  drawing: JSON.stringify({ instruction: "Zeichne ein Haus.", width: 600, height: 300 }, null, 2),
  number_wall: JSON.stringify({ rows: [[3, null, 5, 2], [null, null, null], [null, null], [null]] }, null, 2),
  number_line: JSON.stringify({ min: 0, max: 20, step: 1, toPlace: [7, 13, 18], showNumbers: true }, null, 2),
  calculation_wheel: JSON.stringify({ center: 6, operation: "*", spokes: [1, 2, 3, 4, 5, 6, 7, 8, null, null], mode: "fill_outer" }, null, 2),
  hundred_chart: JSON.stringify({ task: "Markiere alle Vielfachen von 5", mode: "mark", preMarked: [] }, null, 2),
};

export default async function WorksheetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const worksheet = await prisma.worksheet.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true } },
      items: { orderBy: { order: "asc" } },
      assignments: {
        include: {
          class: { select: { name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!worksheet || worksheet.creatorId !== session.userId) notFound();

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const subjects = await prisma.subject.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const updateWithId = updateWorksheet.bind(null, id);
  const publishWithId = publishWorksheet.bind(null, id);
  const deleteWithId = deleteWorksheet.bind(null, id);
  const assignWithId = assignWorksheet.bind(null, id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-start gap-4">
        <Link href="/teach/arbeitsblatter" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{worksheet.title}</h1>
            <Badge variant={worksheet.status === "published" ? "success" : "neutral"}>
              {worksheet.status === "published" ? "Veröffentlicht" : "Entwurf"}
            </Badge>
          </div>
          {worksheet.description && (
            <p className="mt-1 text-sm text-muted-fg">{worksheet.description}</p>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Metadaten bearbeiten</CardTitle>
          <form action={publishWithId}>
            <button
              type="submit"
              className={buttonVariants({
                variant: worksheet.status === "published" ? "outline" : "primary",
                size: "sm",
              })}
            >
              {worksheet.status === "published" ? "Als Entwurf speichern" : "Veröffentlichen"}
            </button>
          </form>
        </CardHeader>
        <CardBody>
          <form action={updateWithId} className="flex flex-col gap-5">
            {worksheet.status === "published" && (
              <input type="hidden" name="status" value="draft" />
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-title">Titel *</Label>
              <Input id="edit-title" name="title" defaultValue={worksheet.title} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-desc">Beschreibung</Label>
              <textarea
                id="edit-desc"
                name="description"
                rows={2}
                defaultValue={worksheet.description ?? ""}
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-grade">Jahrgangsstufe</Label>
                <select
                  id="edit-grade"
                  name="gradeLevel"
                  defaultValue={worksheet.gradeLevel ?? ""}
                  className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <option value="">—</option>
                  {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>Klasse {g}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-diff">Schwierigkeit</Label>
                <select
                  id="edit-diff"
                  name="difficulty"
                  defaultValue={worksheet.difficulty}
                  className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <option value="leicht">Leicht</option>
                  <option value="mittel">Mittel</option>
                  <option value="schwer">Schwer</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-minutes">Minuten</Label>
                <Input
                  id="edit-minutes"
                  name="estimatedMinutes"
                  type="number"
                  min={1}
                  defaultValue={worksheet.estimatedMinutes}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-subject">Fach</Label>
              <select
                id="edit-subject"
                name="subjectId"
                defaultValue={worksheet.subjectId ?? ""}
                className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <option value="">— kein Fach —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Speichern
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items ({worksheet.items.length})</CardTitle>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          {worksheet.items.length === 0 ? (
            <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-fg">
              Noch keine Items. Füge unten ein Item hinzu.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {worksheet.items.map((item) => {
                let configLabel = "";
                try {
                  const cfg = JSON.parse(item.config);
                  configLabel = cfg.label ?? cfg.question ?? cfg.instruction ?? cfg.text ?? item.config;
                } catch {
                  configLabel = item.config;
                }
                const deleteItemAction = deleteWorksheetItem.bind(null, id, item.id);
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="font-mono text-xs text-muted-fg">{item.order}</span>
                    <Badge variant="neutral">{ITEM_TYPE_LABEL[item.type] ?? item.type}</Badge>
                    <p className="min-w-0 flex-1 truncate text-sm">
                      {String(configLabel).slice(0, 60)}
                    </p>
                    <span className="text-xs text-muted-fg">{item.points} Pkt.</span>
                    <form action={deleteItemAction}>
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label="Item löschen"
                      >
                        <Trash2 className="size-3.5 text-danger" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item hinzufügen</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-6">
            {ITEM_TYPES.map((type) => {
              const saveAction = saveWorksheetItem.bind(null, id);
              return (
                <details key={type} className="group border border-border">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-surface">
                    {ITEM_TYPE_LABEL[type]}
                    <span className="text-xs font-normal text-muted-fg">aufklappen</span>
                  </summary>
                  <div className="border-t border-border px-4 pb-4 pt-4">
                    <form action={saveAction} className="flex flex-col gap-4">
                      <input type="hidden" name="type" value={type} />
                      <input type="hidden" name="order" value={worksheet.items.length + 1} />

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`config-${type}`}>Config (JSON)</Label>
                        <textarea
                          id={`config-${type}`}
                          name="config"
                          rows={8}
                          defaultValue={CONFIG_EXAMPLES[type] ?? "{}"}
                          className="w-full border border-border bg-bg px-3 py-2 font-mono text-xs text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`answer-${type}`}>Korrekte Antwort (JSON, optional)</Label>
                        <Input
                          id={`answer-${type}`}
                          name="correctAnswer"
                          placeholder='z. B. "Berlin" oder [0, 2]'
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`hint-${type}`}>Hinweis</Label>
                          <Input id={`hint-${type}`} name="hint" placeholder="Tipp für Schüler …" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`points-${type}`}>Punkte</Label>
                          <Input
                            id={`points-${type}`}
                            name="points"
                            type="number"
                            min={0}
                            defaultValue={1}
                          />
                        </div>
                        <div className="flex items-end gap-2 pb-0.5">
                          <input
                            id={`required-${type}`}
                            name="required"
                            type="checkbox"
                            defaultChecked
                            className="size-4 accent-brand"
                          />
                          <Label htmlFor={`required-${type}`}>Pflichtfeld</Label>
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-border pt-3">
                        <button type="submit" className={buttonVariants({ size: "sm" })}>
                          Item speichern
                        </button>
                      </div>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zuweisungen ({worksheet.assignments.length})</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={assignWithId} className="flex flex-col gap-4 border-b border-border pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-class">Klasse *</Label>
                <select
                  id="assign-class"
                  name="classId"
                  required
                  className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <option value="">— Klasse wählen —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-due">Fällig am (optional)</Label>
                <Input id="assign-due" name="dueAt" type="datetime-local" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-attempts">Max. Versuche</Label>
                <Input id="assign-attempts" name="maxAttempts" type="number" min={1} defaultValue={1} />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <input
                  id="assign-hints"
                  name="showHints"
                  type="checkbox"
                  defaultChecked
                  className="size-4 accent-brand"
                />
                <Label htmlFor="assign-hints">Hinweise anzeigen</Label>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <input
                  id="assign-solution"
                  name="showSolution"
                  type="checkbox"
                  className="size-4 accent-brand"
                />
                <Label htmlFor="assign-solution">Lösung anzeigen</Label>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className={buttonVariants({ size: "sm" })}>
                Zuweisen
              </button>
            </div>
          </form>

          {worksheet.assignments.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {worksheet.assignments.map((a) => {
                const deleteAction = deleteAssignment.bind(null, a.id);
                return (
                  <li key={a.id} className="flex items-center gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{a.class?.name ?? "—"}</p>
                      <p className="mt-0.5 text-xs text-muted-fg">
                        Zugewiesen {a.assignedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                        {a.dueAt && ` · Fällig ${a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-fg">
                      {a._count.submissions} Abgaben
                    </span>
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label="Zuweisung löschen"
                      >
                        <Trash2 className="size-3.5 text-danger" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Gefahrenzone</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-muted-fg">
            Dieses Arbeitsblatt und alle zugehörigen Daten werden unwiderruflich gelöscht.
          </p>
          <form action={deleteWithId}>
            <button
              type="submit"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Trash2 className="size-3.5" />
              Arbeitsblatt löschen
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
