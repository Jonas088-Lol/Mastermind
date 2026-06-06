import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const fuerLinks = [
  { href: "/fuer/schueler", label: "Für Schüler" },
  { href: "/fuer/lehrer", label: "Für Lehrer" },
  { href: "/fuer/schulen", label: "Für Schulen" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <BrandLogo height="h-8" showName />
        </Link>

        <nav className="hidden gap-8 md:flex" aria-label="Hauptnavigation">
          <Link
            href="/funktionen"
            className="text-sm font-medium text-muted-fg transition-colors hover:text-fg"
          >
            Funktionen
          </Link>

          {/* "Fur wen?" dropdown — CSS-only hover */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-muted-fg transition-colors hover:text-fg group-hover:text-fg"
            >
              Für wen?
              <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" strokeWidth={2} />
            </button>
            <div
              className="invisible absolute left-0 top-full z-50 mt-1 min-w-45 border border-border bg-bg opacity-0 shadow-md transition-all group-hover:visible group-hover:opacity-100"
              role="menu"
            >
              {fuerLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm text-muted-fg transition-colors hover:bg-surface hover:text-fg"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/preise"
            className="text-sm font-medium text-muted-fg transition-colors hover:text-fg"
          >
            Preise
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} hidden sm:inline-flex`}
          >
            Anmelden
          </Link>
          <Button size="sm">Demo buchen</Button>
        </div>
      </Container>
    </header>
  );
}
