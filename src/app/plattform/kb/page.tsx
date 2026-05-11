import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Knowledge Base · Plattform" };

const ARTICLES = [
  { category: "Onboarding", title: "Neue Schule einrichten", updated: "2. Mai 2026", views: 1240 },
  { category: "Onboarding", title: "Untis-Import Schritt für Schritt", updated: "28. Apr. 2026", views: 983 },
  { category: "SSO", title: "Microsoft Entra ID konfigurieren", updated: "15. Apr. 2026", views: 762 },
  { category: "SSO", title: "Google Workspace SSO einrichten", updated: "10. Apr. 2026", views: 541 },
  { category: "Abrechnung", title: "Lizenzmodelle im Überblick", updated: "1. Apr. 2026", views: 489 },
  { category: "API", title: "REST-API & Webhooks", updated: "20. März 2026", views: 334 },
  { category: "DSGVO", title: "Datenschutz & AVV — Checkliste", updated: "5. März 2026", views: 1891 },
  { category: "DSGVO", title: "DSGVO-Export anfordern", updated: "5. März 2026", views: 672 },
];

export default async function PlattformKbPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const categories = [...new Set(ARTICLES.map((a) => a.category))];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-fg">Interne Dokumentation für Onboarding, Support und Technik.</p>
      </header>

      <div className="flex items-center gap-2 border border-border bg-bg px-3 py-2">
        <Search className="size-4 text-muted-fg" />
        <Input className="border-0 p-0 focus-visible:ring-0" placeholder="Artikel suchen …" />
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">{cat}</h2>
          <ul className="divide-y divide-border border border-border">
            {ARTICLES.filter((a) => a.category === cat).map((a) => (
              <li key={a.title} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                <BookOpen className="size-4 shrink-0 text-muted-fg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-fg">Aktualisiert: {a.updated} · {a.views.toLocaleString("de-DE")} Aufrufe</p>
                </div>
                <ExternalLink className="size-3.5 shrink-0 text-muted-fg" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
