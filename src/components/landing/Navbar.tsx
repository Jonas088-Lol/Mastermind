"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/BrandLogo";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/funktionen", label: "Funktionen" },
  { href: "/preise", label: "Preise" },
  { href: "/fuer/schulen", label: "Für Schulen" },
  { href: "/fuer/lehrer", label: "Für Lehrer" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-200",
          scrolled
            ? "border-b border-border bg-bg/90 backdrop-blur-lg shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <BrandLogo height="h-8" showName />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
            >
              Anmelden
            </Link>
            <Button size="sm" className="hidden sm:inline-flex">
              Demo buchen
            </Button>
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-lg text-fg transition-colors hover:bg-surface md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-bg transition-all duration-300 ease-out md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ paddingTop: "64px" }}
      >
        <nav className="flex flex-col gap-1 p-5" aria-label="Mobile Navigation">
          {navLinks.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-fg transition-colors hover:bg-surface",
                open && `animate-slide-up animate-delay-${i === 0 ? "100" : i === 1 ? "200" : "300"}`
              )}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
            >
              Anmelden
            </Link>
            <Button size="lg" className="w-full" onClick={() => setOpen(false)}>
              Demo buchen
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
