"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
  url?: string;
  className?: string;
}

export function WorksheetShareButton({ title, url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Arbeitsblatt: ${title}`, url: shareUrl });
      } catch (err) {
        if ((err as Error).name !== "AbortError") fallbackCopy(shareUrl);
      }
    } else {
      fallbackCopy(shareUrl);
    }
  }

  function fallbackCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-brand ${className ?? ""}`}
      title="Arbeitsblatt teilen"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-success" />
          Link kopiert
        </>
      ) : (
        <>
          <Share2 className="size-3.5" />
          Teilen
        </>
      )}
    </button>
  );
}
