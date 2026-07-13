/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/BrandLogo";
import { Menu, X, ChevronDown, School, Presentation, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/funktionen", label: "Funktionen" },
  { href: "/preise", label: "Preise" },
];

const appLink = { href: "/download", label: "App" };

const roleLinks = [
  { href: "/fuer/schulen",  label: "Für Schulen",  desc: "Verwaltung & Übersicht",  icon: School },
  { href: "/fuer/lehrer",   label: "Für Lehrer",   desc: "Unterricht & Korrektur",  icon: Presentation },
  { href: "/fuer/schueler", label: "Für Schüler",  desc: "Lernen & Gamification",   icon: GraduationCap },
  { href: "/fuer/eltern",   label: "Für Eltern",   desc: "Noten & Kommunikation",   icon: Users },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
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
    else { document.body.style.overflow = ""; setRoleOpen(false); }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMobile() {
    setOpen(false);
    setRoleOpen(false);
  }

  return (
    <>
      <header
        className={cn(
          // Durchgängig unscharf-transparenter Hintergrund — auch ganz oben.
          "sticky top-0 z-50 w-full border-b border-border bg-surface/70 shadow-sm backdrop-blur-lg transition-all duration-300",
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
            className="hidden items-center gap-0.5 lg:flex"
            aria-label="Hauptnavigation"
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg"
              >
                {l.label}
              </Link>
            ))}

            {/* "Für jede Rolle" — Aufklapp-Menü beim Hovern */}
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg group-hover:bg-surface group-hover:text-fg"
              >
                Für jede Rolle
                <ChevronDown className="size-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>

              {/* Schwebendes Panel (unscharf-transparent, wie die Navbar) */}
              <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="translate-y-1 rounded-2xl border border-border-strong bg-surface/70 p-2 shadow-lg backdrop-blur-lg transition-transform duration-200 group-hover:translate-y-0">
                  {roleLinks.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                        <r.icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-fg">{r.label}</span>
                        <span className="block text-xs text-muted-fg">{r.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={appLink.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg"
            >
              {appLink.label}
            </Link>
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
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ size: "sm" }),
                "pastel-cta hidden sm:inline-flex"
              )}
            >
              Kostenlos testen
            </Link>
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-lg text-fg transition-colors hover:bg-surface-2 lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface transition-all duration-300 ease-out lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ paddingTop: "64px" }}
      >
        <nav
          className="flex flex-col gap-1 p-5"
          aria-label="Mobile Navigation"
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeMobile}
              className="flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-fg transition-colors hover:bg-surface-2"
            >
              {l.label}
            </Link>
          ))}

          {/* "Für jede Rolle" — antippen zum Ausklappen */}
          <button
            type="button"
            onClick={() => setRoleOpen((v) => !v)}
            aria-expanded={roleOpen}
            className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium text-fg transition-colors hover:bg-surface-2"
          >
            Für jede Rolle
            <ChevronDown className={cn("size-4 transition-transform duration-200", roleOpen && "rotate-180")} />
          </button>
          {roleOpen && (
            <div className="ml-2 flex flex-col gap-1 rounded-2xl border border-border-strong bg-surface/70 p-2 backdrop-blur-lg">
              {roleLinks.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                    <r.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-fg">{r.label}</span>
                    <span className="block text-xs text-muted-fg">{r.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href={appLink.href}
            onClick={closeMobile}
            className="flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-fg transition-colors hover:bg-surface-2"
          >
            {appLink.label}
          </Link>

          <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm text-muted-fg">Darstellung</span>
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              onClick={closeMobile}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full"
              )}
            >
              Anmelden
            </Link>
            <Link
              href="/onboarding"
              onClick={closeMobile}
              className={cn(
                buttonVariants({ size: "lg" }),
                "pastel-cta w-full"
              )}
            >
              Kostenlos testen
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
