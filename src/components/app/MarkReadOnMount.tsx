"use client";

import { useEffect } from "react";
import { markThreadRead } from "@/lib/actions/messaging";

export function MarkReadOnMount({ threadId }: { threadId: string }) {
  useEffect(() => {
    markThreadRead(threadId).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
  return null;
}
