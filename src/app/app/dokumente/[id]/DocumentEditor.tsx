"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { BlockEditor } from "@/components/app/BlockEditor";
import { saveDocumentContent, renameDocument, deleteDocument } from "../actions";

interface Props {
  documentId: string;
  initialTitle: string;
  initialContent: string;
}

export function DocumentEditor({ documentId, initialTitle, initialContent }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [, startTransition] = useTransition();

  function commitTitle() {
    const val = title.trim();
    const final = val || "Unbenanntes Dokument";
    setTitle(final);
    setEditingTitle(false);
    if (final !== initialTitle) {
      startTransition(() => renameDocument(documentId, final));
    }
  }

  function handleSaveContent(id: string, content: string) {
    return saveDocumentContent(id, content);
  }

  function handleDelete() {
    if (!confirm(`Dokument "${title}" wirklich löschen?`)) return;
    startTransition(() => deleteDocument(documentId));
  }

  return (
    <div className="-mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden print:m-0 print:h-auto print:overflow-visible lg:-mx-10 lg:-mb-10 lg:-mt-10">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-2 print:hidden">
        <Link
          href="/app/dokumente"
          className="grid size-8 place-items-center text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitle(initialTitle);
                  setEditingTitle(false);
                }
              }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="truncate text-sm font-semibold transition-colors hover:text-brand"
              title="Klicken zum Umbenennen"
            >
              {title}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="grid size-8 place-items-center border border-border text-muted-fg transition-colors hover:text-fg"
          title="Drucken / Als PDF speichern"
        >
          <Printer className="size-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="grid size-8 place-items-center border border-border text-muted-fg transition-colors hover:text-danger"
          title="Dokument löschen"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* A4 paper area */}
      <div className="flex-1 overflow-y-auto bg-[#e8e8e8] py-8 print:bg-transparent print:p-0 dark:bg-[#1a1a2e]">
        <div
          className="mx-auto w-full max-w-198.5 min-h-280.75 bg-white px-24 py-20 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_20px_rgba(0,0,0,0.15)] print:max-w-none print:px-0 print:py-0 print:shadow-none"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          {/* Document title */}
          <div className="mb-8 border-b border-gray-200 pb-4">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setTitle(initialTitle);
                    setEditingTitle(false);
                  }
                }}
                className="w-full border-0 text-[26px] font-bold tracking-tight text-[#1a1a1a] focus:outline-none"
              />
            ) : (
              <h1
                className="cursor-text text-[26px] font-bold tracking-tight text-[#1a1a1a] transition-colors hover:text-brand/70"
                onClick={() => setEditingTitle(true)}
              >
                {title}
              </h1>
            )}
          </div>

          <BlockEditor
            pageId={documentId}
            initialContent={initialContent}
            onSave={handleSaveContent}
          />
        </div>
      </div>
    </div>
  );
}
