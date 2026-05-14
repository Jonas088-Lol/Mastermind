import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { getSession, isSuper } from "@/lib/session";

export const metadata: Metadata = { title: "Knowledge Base · Plattform" };

const ARTICLES = [
  { category: "Onboarding", title: "Neue Schule einrichten" },
  { category: "Onboarding", title: "Untis-Import Schritt für Schritt" },
  { category: "Onboarding", title: "Klassen und Fächer anlegen" },
  { category: "SSO", title: "Microsoft Entra ID konfigurieren" },
  { category: "SSO", title: "Google Workspace SSO einrichten" },
  { category: "Abrechnung", title: "Lizenzmodelle im Überblick" },
  { category: "Abrechnung", title: "Sitz-Kontingent erhöhen" },
  { category: "API", title: "REST-API & Webhooks" },
  { category: "DSGVO", title: "Datenschutz & AVV — Checkliste" },
  { category: "DSGVO", title: "DSGVO-Export anfordern" },
  { category: "Fehlerbehebung", title: "Häufige Login-Probleme" },
  { category: "Fehlerbehebung", title: "Push-Benachrichtigungen einrichten" },
];

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PlattformKbPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const filtered = query
    ? ARTICLES.filter((a) => a.title.toLowerCase().includes(query) || a.category.toLowerCase().includes(query))
    : ARTICLES;

  const categories = [...new Set(filtered.map((a) => a.category))];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <Link
          href="/plattform"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Plattform
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-fg">Interne Dokumentation für Onboarding, Support und Technik.</p>
      </header>

      <form action="/plattform/kb" method="get" className="flex items-center gap-2 border border-border bg-bg px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-fg" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Artikel suchen …"
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </form>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">Keine Artikel für „{q}"</p>
          <Link href="/plattform/kb" className="mt-2 text-xs text-brand hover:underline">Suche zurücksetzen</Link>
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">{cat}</h2>
            <ul className="divide-y divide-border border border-border">
              {filtered.filter((a) => a.category === cat).map((a) => (
                <li key={a.title} className="flex items-center gap-4 px-5 py-3.5">
                  <BookOpen className="size-4 shrink-0 text-muted-fg" />
                  <p className="min-w-0 flex-1 text-sm font-semibold">{a.title}</p>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-fg/60">
                    Bald
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
