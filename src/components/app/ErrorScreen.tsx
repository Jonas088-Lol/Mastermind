"use client";

import Link from "next/link";
import { AlertOctagon, ArrowLeft, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export interface ErrorScreenProps {
  title: string;
  body: string;
  digest?: string;
  retry?: () => void;
  homeHref?: string;
}

export function ErrorScreen({
  title,
  body,
  digest,
  retry,
  homeHref = "/",
}: ErrorScreenProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-xl border border-border bg-bg p-8 sm:p-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
            MM
          </span>
          <span>MasterMind</span>
        </Link>

        <div className="mt-10 flex items-start gap-4 border-l-2 border-danger pl-4">
          <AlertOctagon
            className="mt-0.5 size-5 shrink-0 text-danger"
            strokeWidth={1.75}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-danger">
              Fehler · etwas ist schiefgelaufen
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-muted-fg">{body}</p>
          </div>
        </div>

        {digest && (
          <p className="mt-6 border border-dashed border-border bg-surface px-4 py-2 font-mono text-[11px] text-muted-fg">
            Fehler-Referenz: {digest}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {retry && (
            <Button
              type="button"
              size="md"
              className="flex-1"
              onClick={retry}
            >
              <RefreshCw className="size-4" />
              Erneut versuchen
            </Button>
          )}
          <Link
            href={homeHref}
            className={`${buttonVariants({ variant: "outline", size: "md" })} flex-1`}
          >
            <ArrowLeft className="size-4" />
            Zurück
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-fg">
          Bleibt der Fehler bestehen? Schreib uns an{" "}
          <a
            href="mailto:support@mastermind.app"
            className="underline underline-offset-2 hover:text-fg"
          >
            support@mastermind.app
          </a>
          .
        </p>
      </div>
    </main>
  );
}
