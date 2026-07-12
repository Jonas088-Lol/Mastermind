/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { Flag, MoreHorizontal, Smile, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteMessage, flagMessage, toggleReaction } from "../../actions";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface Reaction {
  emoji: string;
  count: number;
  byMe: boolean;
}

interface MessageRowProps {
  message: {
    id: string;
    content: string;
    sentAt: Date;
    deletedAt: Date | null;
    authorId: string;
    author: { id: string; name: string };
    reactions: Array<{ id: string; emoji: string; userId: string }>;
  };
  showAuthor: boolean;
  isMe: boolean;
  isSpaceAdmin: boolean;
  currentUserId: string;
}

export function MessageRow({ message, showAuthor, isMe, isSpaceAdmin, currentUserId }: MessageRowProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [, startTransition] = useTransition();

  const reactions: Reaction[] = QUICK_EMOJIS.map((emoji) => {
    const matching = message.reactions.filter((r) => r.emoji === emoji);
    return { emoji, count: matching.length, byMe: matching.some((r) => r.userId === currentUserId) };
  }).filter((r) => r.count > 0);

  function handleReaction(emoji: string) {
    setShowEmojiPicker(false);
    startTransition(() => toggleReaction(message.id, emoji));
  }

  function handleDelete() {
    if (!confirm("Nachricht wirklich löschen?")) return;
    startTransition(() => deleteMessage(message.id));
  }

  function handleFlag() {
    startTransition(() => flagMessage(message.id));
    setShowActions(false);
  }

  if (message.deletedAt) {
    return (
      <div className={cn("group flex gap-2.5", showAuthor && "mt-4")}>
        <div className="w-8 shrink-0" />
        <p className="text-sm italic text-muted-fg">Diese Nachricht wurde gelöscht.</p>
      </div>
    );
  }

  return (
    <div
      className={cn("group relative flex gap-2.5", showAuthor && "mt-4")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {showAuthor ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
          {message.author.name[0].toUpperCase()}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {showAuthor && (
          <div className="flex items-baseline gap-2">
            <span className={cn("text-sm font-semibold", isMe && "text-brand")}>
              {isMe ? "Du" : message.author.name}
            </span>
            <span className="text-[10px] text-muted-fg">
              {message.sentAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{message.content}</p>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => handleReaction(r.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  r.byMe
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-border bg-surface text-muted-fg hover:border-brand/30 hover:text-fg"
                )}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action bar */}
      {showActions && (
        <div className="absolute -top-7 right-0 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-bg shadow-lg">
          {/* Quick emoji picker toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex size-7 items-center justify-center rounded-md text-muted-fg hover:bg-surface hover:text-fg"
              title="Reaktion hinzufügen"
            >
              <Smile className="size-3.5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-lg border border-border bg-bg p-1 shadow-lg">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReaction(emoji)}
                    className="flex size-7 items-center justify-center rounded-md text-base hover:bg-surface"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActions((v) => !v)}
              className="flex size-7 items-center justify-center rounded-md text-muted-fg hover:bg-surface hover:text-fg"
              title="Mehr"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>

          {/* Flag */}
          {!isMe && (
            <button
              type="button"
              onClick={handleFlag}
              className="flex size-7 items-center justify-center rounded-md text-muted-fg hover:bg-warning/10 hover:text-warning"
              title="Melden"
            >
              <Flag className="size-3.5" />
            </button>
          )}

          {/* Delete (own message or space admin) */}
          {(isMe || isSpaceAdmin) && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex size-7 items-center justify-center rounded-md text-muted-fg hover:bg-error/10 hover:text-error"
              title="Löschen"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
