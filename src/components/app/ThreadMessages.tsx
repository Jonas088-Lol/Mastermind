/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Reply, Send, Trash2, X, Check, Flag } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { sendMessage, editThreadMessage, deleteThreadMessage, reportThreadMessage } from "@/lib/actions/messaging";
import { cn } from "@/lib/utils";

export type ThreadMsg = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  sentAt: string; // ISO
  editedAt: string | null;
  replyTo: { id: string; content: string; senderName: string } | null;
};

export function ThreadMessages({
  threadId,
  backHref,
  myId,
  messages,
}: {
  threadId: string;
  backHref: string;
  myId: string;
  messages: ThreadMsg[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ThreadMsg | null>(null);
  const [editing, setEditing] = useState<ThreadMsg | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Long-press support for touch devices — press ~450ms to open the action bar
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleTouchStart(msgId: string) {
    longPressTimer.current = setTimeout(() => setHovered(msgId), 450);
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  function startEdit(msg: ThreadMsg) {
    setEditing(msg);
    setEditValue(msg.content);
    setReplyTo(null);
    setHovered(null);
  }

  function submitEdit() {
    if (!editing || !editValue.trim()) return;
    const id = editing.id;
    const value = editValue;
    setEditing(null);
    startTransition(() => editThreadMessage(id, value));
  }

  function handleDelete(msgId: string) {
    setHovered(null);
    startTransition(() => deleteThreadMessage(msgId));
  }

  const [reported, setReported] = useState<Set<string>>(new Set());
  function handleReport(msgId: string) {
    setHovered(null);
    if (reported.has(msgId)) return;
    startTransition(async () => {
      const r = await reportThreadMessage(msgId);
      if (r && "ok" in r) setReported((prev) => new Set(prev).add(msgId));
    });
  }

  function startReply(msg: ThreadMsg) {
    setReplyTo(msg);
    setEditing(null);
    setHovered(null);
    textareaRef.current?.focus();
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-5 py-6 min-h-100">
        {messages.map((msg) => {
          const isOwn = msg.senderId === myId;
          const sentAt = new Date(msg.sentAt);
          return (
            <div
              key={msg.id}
              className={cn("group relative flex items-end gap-3", isOwn && "flex-row-reverse")}
              onMouseEnter={() => setHovered(msg.id)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => handleTouchStart(msg.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              {!isOwn && <Avatar name={msg.senderName} size="sm" className="shrink-0" />}
              <div className={cn("flex max-w-[75%] flex-col gap-1", isOwn && "items-end")}>
                {!isOwn && (
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                    {msg.senderName}
                  </p>
                )}
                {msg.replyTo && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border-l-2 border-brand/60 bg-surface px-2.5 py-1.5 text-[11px] text-muted-fg",
                      isOwn && "self-end"
                    )}
                  >
                    <Reply className="size-3 shrink-0 -scale-x-100 text-brand" />
                    <span className="shrink-0 font-semibold">{msg.replyTo.senderName}</span>
                    <span className="max-w-48 truncate opacity-75">{msg.replyTo.content}</span>
                  </div>
                )}
                {editing?.id === msg.id ? (
                  <div className="flex w-full items-center gap-2">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="flex-1 rounded-xl border border-brand bg-bg px-3 py-2 text-sm focus:outline-none"
                    />
                    <button onClick={submitEdit} className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg hover:opacity-90">
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={() => setEditing(null)} className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-fg hover:bg-surface">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "border border-border px-4 py-3 text-sm leading-relaxed",
                      isOwn
                        ? "rounded-2xl rounded-tr-sm bg-brand text-brand-fg border-brand"
                        : "rounded-2xl rounded-tl-sm bg-bg"
                    )}
                  >
                    {msg.content}
                  </div>
                )}
                <p className="px-1 font-mono text-[10px] text-muted-fg">
                  {sentAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}{" · "}
                  {sentAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                  {msg.editedAt && <span className="italic"> · bearbeitet</span>}
                </p>
              </div>

              {/* Hover / long-press actions */}
              {hovered === msg.id && editing?.id !== msg.id && (
                <div
                  className={cn(
                    "absolute -top-3 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-bg px-1 py-0.5 shadow-md",
                    isOwn ? "right-0" : "left-11"
                  )}
                >
                  <button
                    onClick={() => startReply(msg)}
                    title="Antworten"
                    className="rounded p-1.5 text-muted-fg hover:bg-surface hover:text-fg"
                  >
                    <Reply className="size-3.5" />
                  </button>
                  {!isOwn && (
                    <button
                      onClick={() => handleReport(msg.id)}
                      title={reported.has(msg.id) ? "Gemeldet" : "Melden"}
                      disabled={reported.has(msg.id)}
                      className={cn(
                        "rounded p-1.5",
                        reported.has(msg.id)
                          ? "text-green-500"
                          : "text-muted-fg hover:bg-amber-500 hover:text-white"
                      )}
                    >
                      {reported.has(msg.id) ? <Check className="size-3.5" /> : <Flag className="size-3.5" />}
                    </button>
                  )}
                  {isOwn && (
                    <>
                      <button
                        onClick={() => startEdit(msg)}
                        title="Bearbeiten"
                        className="rounded p-1.5 text-muted-fg hover:bg-surface hover:text-fg"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        title="Löschen"
                        className="rounded p-1.5 text-muted-fg hover:bg-danger hover:text-white"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-bg px-5 py-4">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-brand bg-surface px-3 py-2">
            <Reply className="size-3.5 shrink-0 -scale-x-100 text-brand" />
            <p className="min-w-0 flex-1 truncate text-xs text-muted-fg">
              Antwort an <span className="font-semibold text-fg">{replyTo.senderId === myId ? "Dich" : replyTo.senderName}</span>: {replyTo.content}
            </p>
            <button onClick={() => setReplyTo(null)} className="rounded p-1 text-muted-fg hover:text-fg">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <form
          ref={formRef}
          action={(fd) => {
            setReplyTo(null);
            startTransition(async () => {
              await sendMessage(fd);
              formRef.current?.reset();
            });
          }}
          className="flex items-end gap-3"
        >
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="backHref" value={backHref} />
          {replyTo && <input type="hidden" name="replyToId" value={replyTo.id} />}
          <textarea
            ref={textareaRef}
            name="content"
            rows={2}
            placeholder="Nachricht schreiben…"
            className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-4" />
            Senden
          </button>
        </form>
      </div>
    </>
  );
}
