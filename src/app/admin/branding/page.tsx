/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandingStudio } from "@/components/admin/BrandingStudio";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { saveBranding } from "./actions";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Branding · Admin" };

export default async function AdminBrandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "branding")) redirect("/admin");

  const school = session.schoolId
    ? await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: {
          name: true,
          brandName: true,
          logoUrl: true,
          logoDarkUrl: true,
          faviconUrl: true,
          accentColor: true,
          secondaryColor: true,
          bgLightColor: true,
          bgDarkColor: true,
          plan: true,
        },
      })
    : null;

  const accent = school?.accentColor ?? "#6ec6ef";
  const secondary = school?.secondaryColor ?? "#74dcb0";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Branding</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Passe das Erscheinungsbild der Plattform für {school?.brandName ?? school?.name ?? "deine Schule"} an.
          Alle Änderungen gelten sofort — auch auf der mobilen App.
        </p>
      </header>

      {/* ── Identität ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="size-4 text-muted-fg" />
            <CardTitle>Schulidentität</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <form action={saveBranding} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="school-name">Offizieller Schulname</Label>
              <Input id="school-name" name="schoolName" defaultValue={school?.name ?? ""} required />
              <p className="text-xs text-muted-fg">Wird intern und in offiziellen Dokumenten verwendet.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Anzeigename <span className="text-muted-fg">(optional)</span></Label>
              <Input
                id="brand-name"
                name="brandName"
                defaultValue={school?.brandName ?? ""}
                placeholder={school?.name ?? "z. B. Gymnasium Nord"}
              />
              <p className="text-xs text-muted-fg">Falls leer, wird der offizielle Schulname verwendet.</p>
            </div>

            {/* ── Logos ──────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="logo">Logo (heller Hintergrund)</Label>
              {school?.logoUrl && (
                <div className="mb-2 flex items-center gap-3 rounded border border-border bg-surface p-2">
                  <Image
                    src={school.logoUrl}
                    alt="Aktuelles Logo"
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-xs text-muted-fg">Aktuell aktiv</span>
                </div>
              )}
              <Input id="logo" name="logo" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" />
              <p className="text-xs text-muted-fg">PNG, JPEG, SVG oder WebP · max. 2 MB · empfohlen: transparent, min. 256 px hoch</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo-dark">Logo (dunkler Hintergrund / Dark Mode)</Label>
              {school?.logoDarkUrl && (
                <div className="mb-2 flex items-center gap-3 rounded border border-border bg-fg p-2">
                  <Image
                    src={school.logoDarkUrl}
                    alt="Aktuelles Dark-Logo"
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-xs text-bg">Aktuell aktiv (Dark)</span>
                </div>
              )}
              <Input id="logo-dark" name="logoDark" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" />
              <p className="text-xs text-muted-fg">Wird im Dark Mode oder dunklen Seitenleisten verwendet. Optional — falls nicht gesetzt, wird das Standard-Logo verwendet.</p>
            </div>

            <Button type="submit" className="w-full sm:w-auto">Schulidentität speichern</Button>
          </form>
        </CardBody>
      </Card>

      {/* ── Farben: Voreinstellungen ODER Personalisierung ─────────────────── */}
      <form action={saveBranding} className="space-y-6">
        {/* Identitätsfelder erneut mitsenden wäre doppelt — dieses Formular
            speichert ausschließlich die Farb- und Favicon-Einstellungen. */}
        <BrandingStudio
          defaultAccent={accent}
          defaultSecondary={secondary}
          defaultBgLight={school?.bgLightColor ?? null}
          defaultBgDark={school?.bgDarkColor ?? null}
          faviconSlot={
            <div className="space-y-1.5">
              <Label htmlFor="favicon">Favicon (Browser-Tab-Icon)</Label>
              {school?.faviconUrl && (
                <div className="mb-2 flex items-center gap-3 rounded border border-border bg-surface p-2">
                  <Image
                    src={school.faviconUrl}
                    alt="Aktuelles Favicon"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-xs text-muted-fg">Aktuell aktiv</span>
                </div>
              )}
              <Input id="favicon" name="favicon" type="file" accept=".ico,.png,.svg" />
              <p className="text-xs text-muted-fg">PNG, SVG oder ICO · max. 2 MB · empfohlen: quadratisch, mind. 64 × 64 px</p>
            </div>
          }
        />

        <Button type="submit" className="w-full sm:w-auto">Farben speichern</Button>
      </form>

      {/* ── Logo-Vorschau ─────────────────────────────────────────────────── */}
      {school?.logoUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Logo-Vorschau (gespeichert)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {/* Light */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Hell</p>
                <div className="flex items-center justify-center rounded border border-border bg-white py-8 px-4">
                  <Image
                    src={school.logoUrl}
                    alt={school.brandName ?? school.name ?? "Logo"}
                    width={140}
                    height={70}
                    className="max-h-14 object-contain"
                  />
                </div>
              </div>
              {/* Dark */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Dunkel</p>
                <div className="flex items-center justify-center rounded border border-[hsl(222,14%,18%)] bg-[hsl(222,24%,7%)] py-8 px-4">
                  <Image
                    src={school.logoDarkUrl ?? school.logoUrl}
                    alt={school.brandName ?? school.name ?? "Logo"}
                    width={140}
                    height={70}
                    className="max-h-14 object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="size-4 rounded-sm border border-border shadow-sm"
                  style={{ backgroundColor: accent }}
                />
                <span className="font-mono text-xs text-muted-fg">Primär: {accent}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="size-4 rounded-sm border border-border shadow-sm"
                  style={{ backgroundColor: secondary }}
                />
                <span className="font-mono text-xs text-muted-fg">Sekundär: {secondary}</span>
              </div>
              <div
                className="h-3 w-24 rounded-full border border-border"
                style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${secondary})` }}
                title="Farbverlauf"
              />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
