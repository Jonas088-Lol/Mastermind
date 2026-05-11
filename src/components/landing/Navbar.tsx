import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "#fuer-schulen", label: "Für Schulen" },
  { href: "#fuer-schueler", label: "Für Schüler" },
  { href: "#funktionen", label: "Funktionen" },
  { href: "#preise", label: "Preise" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
            MM
          </span>
          <span className="text-base">MasterMind</span>
        </Link>

        <nav className="hidden gap-8 md:flex" aria-label="Hauptnavigation">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-fg transition-colors hover:text-fg"
            >
              {l.label}
            </a>
          ))}
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
