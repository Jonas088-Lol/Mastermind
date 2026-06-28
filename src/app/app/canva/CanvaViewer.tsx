"use client";

import { useState } from "react";
import { ExternalLink, Maximize2 } from "lucide-react";

export function CanvaViewer({ embedUrl, title }: { embedUrl: string; title: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="relative aspect-video bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            onClick={() => setExpanded(true)}
            className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
            title="Vollbild"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <a
            href={embedUrl.replace("?embed", "").replace("view", "view")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
            title="In Canva öffnen"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full max-w-6xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={embedUrl}
              title={title}
              allowFullScreen
              className="absolute inset-0 size-full rounded-2xl"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            <button
              onClick={() => setExpanded(false)}
              className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
