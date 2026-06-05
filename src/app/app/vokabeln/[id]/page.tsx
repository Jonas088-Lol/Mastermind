import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { addVocabEntry, deleteVocabEntry, deleteVocabList, renameVocabList } from "../actions";
import { VocabTrainer } from "./VocabTrainer";
import { AIImportForm } from "./AIImportForm";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const list = await prisma.vocabList.findUnique({ where: { id }, select: { title: true } });
  return { title: list ? `${list.title} · Vokabeln` : "Vokabeln" };
}

export default async function VocabListPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const { id } = await params;
  const list = await prisma.vocabList.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!list || list.userId !== session.userId) notFound();

  const now = new Date();
  const dueCount = list.entries.filter(e => e.nextReview <= now).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/app/vokabeln" className="mt-1 text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            {list.langFrom} → {list.langTo}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{list.title}</h1>
          <p className="mt-0.5 text-sm text-muted-fg">
            {list.entries.length} Vokabeln ·{" "}
            {dueCount > 0 ? (
              <span className="font-semibold text-warning">{dueCount} heute fällig</span>
            ) : (
              <span className="text-success">Alle erledigt</span>
            )}
          </p>
        </div>
        <form action={deleteVocabList.bind(null, list.id)}>
          <button type="submit" title="Liste löschen" className="grid size-9 place-items-center border border-border text-muted-fg hover:border-danger hover:text-danger">
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: trainer */}
        <div className="space-y-6">
          {list.entries.length > 0 ? (
            <VocabTrainer
              entries={list.entries.map(e => ({ ...e, nextReview: e.nextReview }))}
              listId={list.id}
              langFrom={list.langFrom}
              langTo={list.langTo}
              color={list.color}
            />
          ) : (
            <div className="border border-dashed border-border p-10 text-center">
              <p className="font-semibold">Noch keine Vokabeln</p>
              <p className="mt-1 text-sm text-muted-fg">Füge Vokabeln rechts hinzu oder lass die KI welche generieren.</p>
            </div>
          )}

          {/* Word list table */}
          {list.entries.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">
                Alle Vokabeln ({list.entries.length})
              </h2>
              <div className="border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                      <th className="px-4 py-2 text-left">{list.langFrom}</th>
                      <th className="px-4 py-2 text-left">{list.langTo}</th>
                      <th className="px-4 py-2 text-center">WH.</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.entries.map(e => (
                      <tr key={e.id} className="group hover:bg-surface">
                        <td className="px-4 py-2 font-medium">{e.word}</td>
                        <td className="px-4 py-2 text-muted-fg">{e.translation}</td>
                        <td className="px-4 py-2 text-center font-mono text-xs text-muted-fg">{e.repetitions}×</td>
                        <td className="px-2 py-2">
                          <form action={deleteVocabEntry.bind(null, e.id, list.id)}>
                            <button type="submit" className="hidden size-6 place-items-center text-muted-fg hover:text-danger group-hover:grid">
                              <Trash2 className="size-3" strokeWidth={2} />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: add words + AI import */}
        <div className="space-y-4">
          {/* Manual add */}
          <div className="border border-border bg-bg">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Vokabel hinzufügen</p>
            </div>
            <form action={addVocabEntry.bind(null, list.id)} className="space-y-3 p-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{list.langFrom} *</label>
                <input name="word" required placeholder={`${list.langFrom}es Wort`} className="h-9 w-full border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{list.langTo} *</label>
                <input name="translation" required placeholder="Übersetzung" className="h-9 w-full border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Beispielsatz (optional)</label>
                <input name="example" placeholder="Beispiel in Kontext" className="h-9 w-full border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-1.5 bg-fg py-2 text-sm font-semibold text-bg hover:opacity-90">
                <Plus className="size-3.5" />
                Hinzufügen
              </button>
            </form>
          </div>

          {/* AI import */}
          <div className="border border-border bg-bg">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
              <p className="text-sm font-semibold">KI-Import aus Text</p>
            </div>
            <div className="p-4">
              <AIImportForm listId={list.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
