/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

interface Props {
  channelId: string;
}

export function ChatBox({ channelId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  // Polling alle 3 Sekunden
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => router.refresh());
    }, 3000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <form
      ref={ref}
      action="/app/masterspace/api/message"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        ref.current?.reset();
        const { sendSpaceMessage } = await import("../../actions");
        await sendSpaceMessage(fd);
        startTransition(() => router.refresh());
      }}
      className="flex items-end gap-2 border-t border-border bg-bg px-4 py-3"
    >
      <input type="hidden" name="channelId" value={channelId} />
      <textarea
        name="content"
        required
        rows={1}
        placeholder="Nachricht schreiben …"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
      <button
        type="submit"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand/90 active:scale-95"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}
