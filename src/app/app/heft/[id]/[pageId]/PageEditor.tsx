"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { BlockEditor } from "@/components/app/BlockEditor";
import { DrawingCanvas } from "@/components/app/DrawingCanvas";
import { QuizGenerator } from "./QuizGenerator";
import {
  savePageContent,
  renamePage,
  renameNotebook,
  createPage,
  deletePage,
  deleteNotebook,
} from "../../actions";

interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface Props {
  notebookId: string;
  notebookTitle: string;
  notebookColor: string;
  notebookSubject: string | null;
  currentPage: Page;
  allPages: Page[];
}

export function PageEditor({
  notebookId,
  notebookTitle,
  notebookColor,
  notebookSubject,
  currentPage,
  allPages,
}: Props) {
  const [tab, setTab] = useState<"text" | "draw">("text");

  // Notebook title rename
  const [editingNotebook, setEditingNotebook] = useState(false);
  const [nbTitle, setNbTitle] = useState(notebookTitle);

  // Page title rename
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");

  // Notebook options dropdown
  const [nbMenuOpen, setNbMenuOpen] = useState(false);

  const [, startTransition] = useTransition();
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── handlers ────────────────────────────────────────────────

  function handleSaveContent(pageId: string, content: string) {
    return savePageContent(pageId, content);
  }

  function commitNotebookRename() {
    const val = nbTitle.trim();
    if (val && val !== notebookTitle) {
      startTransition(() => renameNotebook(notebookId, val));
    }
    setEditingNotebook(false);
  }

  function startPageRename(page: Page) {
    setRenamingPageId(page.id);
    setRenamingValue(page.title);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitPageRename() {
    if (!renamingPageId) return;
    const val = renamingValue.trim();
    if (val) startTransition(() => renamePage(renamingPageId, val));
    setRenamingPageId(null);
  }

  function handleNewPage() {
    startTransition(() => createPage(notebookId));
  }

  function handleDeletePage(page: Page) {
    if (allPages.length <= 1) return;
    if (!confirm(`Seite „${page.title}" wirklich löschen?`)) return;
    startTransition(() => deletePage(page.id));
  }

  function handleDeleteNotebook() {
    setNbMenuOpen(false);
    if (!confirm(`Heft „${notebookTitle}" und alle Seiten wirklich löschen?`)) return;
    startTransition(() => deleteNotebook(notebookId));
  }

  function handlePrint() {
    window.print();
  }

  const currentIdx = allPages.findIndex((p) => p.id === currentPage.id);

  return (
    <div className="-mx-6 -mt-8 -mb-24 lg:-mx-10 lg:-mt-10 lg:-mb-10 flex h-[calc(100vh-4rem)] overflow-hidden print:h-auto print:overflow-visible print:m-0">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-surface lg:flex print:hidden">
        {/* Back + notebook header */}
        <div
          className="flex flex-col gap-1 border-b border-border px-3 py-3"
          style={{ borderLeftColor: notebookColor, borderLeftWidth: 4 }}
        >
          <Link
            href="/app/heft"
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3" strokeWidth={2} />
            Alle Hefte
          </Link>

          {editingNotebook ? (
            <input
              autoFocus
              value={nbTitle}
              onChange={(e) => setNbTitle(e.target.value)}
              onBlur={commitNotebookRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNotebookRename();
                if (e.key === "Escape") { setNbTitle(notebookTitle); setEditingNotebook(false); }
              }}
              className="border-0 border-b border-brand bg-transparent text-sm font-bold focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNotebook(true)}
              className="truncate text-left text-sm font-bold hover:text-brand"
              title="Klicken zum Umbenennen"
            >
              {nbTitle}
            </button>
          )}

          {notebookSubject && (
            <span className="text-[11px] text-muted-fg">{notebookSubject}</span>
          )}
        </div>

        {/* Page list */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
              Seiten
            </span>
            <span className="font-mono text-[10px] text-muted-fg">{allPages.length}</span>
          </div>

          <ul className="space-y-0.5">
            {allPages.map((page, idx) => {
              const isActive = page.id === currentPage.id;
              const isRenaming = renamingPageId === page.id;

              return (
                <li key={page.id} className="group relative">
                  {isRenaming ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        ref={renameInputRef}
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onBlur={commitPageRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitPageRename();
                          if (e.key === "Escape") setRenamingPageId(null);
                        }}
                        className="flex-1 border border-brand bg-bg px-1.5 py-0.5 text-xs focus:outline-none"
                      />
                    </div>
                  ) : (
                    <a
                      href={`/app/heft/${notebookId}/${page.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 text-xs transition-colors ${
                        isActive
                          ? "bg-bg font-semibold text-fg"
                          : "text-muted-fg hover:bg-bg hover:text-fg"
                      }`}
                    >
                      <FileText className="size-3 shrink-0 opacity-60" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{page.title}</span>

                      {/* Page actions (hover) */}
                      <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); startPageRename(page); }}
                          className="grid size-5 place-items-center text-muted-fg hover:text-fg"
                          title="Umbenennen"
                        >
                          <Pencil className="size-2.5" strokeWidth={2} />
                        </button>
                        {allPages.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleDeletePage(page); }}
                            className="grid size-5 place-items-center text-muted-fg hover:text-danger"
                            title="Seite löschen"
                          >
                            <Trash2 className="size-2.5" strokeWidth={2} />
                          </button>
                        )}
                      </span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Add page */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={handleNewPage}
            className="flex w-full items-center gap-2 px-2 py-2 text-xs text-muted-fg transition-colors hover:bg-bg hover:text-brand"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Neue Seite hinzufügen
          </button>
        </div>
      </aside>

      {/* ── Main editor ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar (wie Word-Ribbon-Leiste) */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-2 print:hidden">
          {/* Mobile back */}
          <Link href="/app/heft" className="lg:hidden">
            <ArrowLeft className="size-4 text-muted-fg" strokeWidth={1.75} />
          </Link>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            {currentIdx > 0 && (
              <a
                href={`/app/heft/${notebookId}/${allPages[currentIdx - 1].id}`}
                className="grid size-7 place-items-center border border-border text-muted-fg transition-colors hover:border-fg hover:text-fg"
                title="Vorherige Seite"
              >
                <ChevronUp className="size-3.5" strokeWidth={2} />
              </a>
            )}
            {currentIdx < allPages.length - 1 && (
              <a
                href={`/app/heft/${notebookId}/${allPages[currentIdx + 1].id}`}
                className="grid size-7 place-items-center border border-border text-muted-fg transition-colors hover:border-fg hover:text-fg"
                title="Nächste Seite"
              >
                <ChevronDown className="size-3.5" strokeWidth={2} />
              </a>
            )}
          </div>

          {/* Page title */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="hidden text-xs text-muted-fg lg:inline">
              {notebookSubject ?? nbTitle} /
            </span>
            {renamingPageId === currentPage.id ? (
              <input
                ref={renameInputRef}
                value={renamingValue}
                onChange={(e) => setRenamingValue(e.target.value)}
                onBlur={commitPageRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitPageRename();
                  if (e.key === "Escape") setRenamingPageId(null);
                }}
                className="border-b border-brand bg-transparent text-sm font-semibold focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => startPageRename(currentPage)}
                className="truncate text-sm font-semibold transition-colors hover:text-brand"
                title="Doppelklick zum Umbenennen"
              >
                {currentPage.title}
              </button>
            )}
            <span className="text-xs text-muted-fg">
              ({currentIdx + 1} / {allPages.length})
            </span>
          </div>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Text / Draw toggle */}
            <div className="flex border border-border">
              <button
                type="button"
                onClick={() => setTab("text")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "text" ? "bg-fg text-bg" : "text-muted-fg hover:bg-surface"
                }`}
              >
                <Pencil className="size-3" strokeWidth={1.75} />
                <span className="hidden sm:inline">Text</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("draw")}
                className={`flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "draw" ? "bg-fg text-bg" : "text-muted-fg hover:bg-surface"
                }`}
              >
                ✏️
                <span className="hidden sm:inline">Zeichnen</span>
              </button>
            </div>

            <QuizGenerator pageId={currentPage.id} pageTitle={currentPage.title} />

            <button
              type="button"
              onClick={handlePrint}
              className="grid size-8 place-items-center border border-border text-muted-fg transition-colors hover:text-fg"
              title="Seite drucken"
            >
              <Printer className="size-3.5" strokeWidth={1.75} />
            </button>

            {/* Notebook options */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNbMenuOpen((o) => !o)}
                className="grid size-8 place-items-center border border-border text-muted-fg transition-colors hover:text-fg"
              >
                <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
              </button>
              {nbMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNbMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 border border-border bg-bg shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setNbMenuOpen(false); handleNewPage(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface"
                    >
                      <Plus className="size-3.5" strokeWidth={1.75} />
                      Neue Seite
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNbMenuOpen(false); setEditingNotebook(true); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface"
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                      Heft umbenennen
                    </button>
                    <div className="border-t border-border" />
                    <button
                      type="button"
                      onClick={handleDeleteNotebook}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                      Heft löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── A4 page area ───────────────────────────────────── */}
        <div
          className={`flex-1 overflow-y-auto print:overflow-visible ${
            tab === "text"
              ? "bg-[#e8e8e8] dark:bg-[#1a1a2e] py-8 print:bg-transparent print:p-0"
              : "bg-surface"
          }`}
        >
          {tab === "text" ? (
            /* A4 paper — white page with shadow like Word */
            <div
              className="
                mx-auto
                w-full max-w-198.5
                min-h-280.75
                bg-white
                px-24 py-20
                shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_20px_rgba(0,0,0,0.15)]
                print:max-w-none print:shadow-none print:px-0 print:py-0
              "
              style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
            >
              {/* Page header / Kopfzeile */}
              <div className="mb-8 border-b border-gray-200 pb-3 print:block">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>{nbTitle}{notebookSubject ? ` — ${notebookSubject}` : ""}</span>
                  <span>{currentPage.title}</span>
                </div>
              </div>

              {/* The block editor — content lives here */}
              <BlockEditor
                pageId={currentPage.id}
                initialContent={currentPage.content}
                onSave={handleSaveContent}
                className="a4-content"
              />

              {/* Page footer */}
              <div className="mt-16 border-t border-gray-200 pt-3 print:block">
                <p className="text-center text-[11px] text-gray-400">
                  Seite {currentIdx + 1} von {allPages.length}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full p-4">
              <DrawingCanvas pageId={currentPage.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
