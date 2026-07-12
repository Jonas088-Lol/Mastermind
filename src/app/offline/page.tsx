/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { CloudOff } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { ReloadButton } from "./reload-button";

export const metadata: Metadata = {
  title: "Offline",
  description: "Du bist gerade offline.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 py-10">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
            MM
          </span>
          <span>MasterMind</span>
        </Link>

        <div className="mt-12 border-l-2 border-warning pl-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warning">
            Offline · keine Verbindung
          </p>
        </div>

        <div className="mt-6 flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center bg-surface">
            <CloudOff className="size-5 text-muted-fg" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Diese Seite ist offline nicht verfügbar.
            </h1>
            <p className="mt-3 text-sm text-muted-fg">
              Sobald du wieder online bist, kannst du die App normal weiternutzen.
              Bereits geladene Inhalte sind weiter zugänglich — schau in die App
              oder auf die Startseite.
            </p>
          </div>
        </div>

        <ul className="mt-10 space-y-2 border-y border-border py-5 text-sm">
          <li className="flex items-center gap-3">
            <span className="size-1.5 shrink-0 bg-brand" aria-hidden />
            Karteikarten bleiben offline lernbar
          </li>
          <li className="flex items-center gap-3">
            <span className="size-1.5 shrink-0 bg-brand" aria-hidden />
            Aufgaben werden synchronisiert, sobald du wieder online bist
          </li>
          <li className="flex items-center gap-3">
            <span className="size-1.5 shrink-0 bg-brand" aria-hidden />
            Push-Benachrichtigungen werden zugestellt, sobald die Verbindung steht
          </li>
        </ul>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <ReloadButton />
          <Link
            href="/"
            className={`${buttonVariants({ variant: "outline", size: "md" })} flex-1`}
          >
            Zur Startseite
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-fg">
          Tipp: Im Schul-WLAN? Manche Schulnetze blockieren WebSockets — App-Sync
          kommt bei Heimnetz oder LTE wieder.
        </p>
      </div>
    </main>
  );
}
