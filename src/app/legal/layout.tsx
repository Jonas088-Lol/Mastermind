/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold tracking-tight transition-colors hover:text-brand"
          >
            <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
              MM
            </span>
            MasterMind
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Zur Startseite
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 lg:py-20">
        <article className="space-y-8">{children}</article>

        <nav className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href="/legal/agb" className="text-muted-fg hover:text-fg">
            AGB
          </Link>
          <Link href="/legal/datenschutz" className="text-muted-fg hover:text-fg">
            Datenschutzerklärung
          </Link>
          <Link href="/legal/impressum" className="text-muted-fg hover:text-fg">
            Impressum
          </Link>
        </nav>
      </main>
    </div>
  );
}
