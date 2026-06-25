"use client";

import { useState, useEffect, useRef } from "react";
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
  { href: "/download", label: "App" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      // Hide on scroll-down past 80px, reveal on scroll-up
      if (y > 80) {
        setHidden(y > lastScrollY.current);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b border-border bg-surface/90 shadow-sm backdrop-blur-lg"
            : "bg-transparent",
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        )}
      >
        <div className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            <BrandLogo height="h-8" showName />
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Hauptnavigation"
          >
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
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden text-muted-fg hover:text-fg sm:inline-flex"
              )}
            >
              Anmelden
            </Link>
            <Button
              size="sm"
              className="hidden bg-brand text-brand-fg hover:bg-brand-dark sm:inline-flex"
            >
              Kostenlos testen
            </Button>
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-lg text-fg transition-colors hover:bg-surface-2 md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-surface transition-all duration-300 ease-out md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ paddingTop: "64px" }}
      >
        <nav
          className="flex flex-col gap-1 p-5"
          aria-label="Mobile Navigation"
        >
          {navLinks.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-fg transition-colors hover:bg-surface-2",
                open &&
                  `animate-slide-up animate-delay-${
                    i === 0 ? "100" : i === 1 ? "200" : "300"
                  }`
              )}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm text-gray-400">Darstellung</span>
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full"
              )}
            >
              Anmelden
            </Link>
            <Button
              size="lg"
              className="w-full bg-brand text-brand-fg hover:bg-brand-dark"
              onClick={() => setOpen(false)}
            >
              Kostenlos testen
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
