import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageIcon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { saveBranding } from "./actions";

export const metadata: Metadata = { title: "Branding · Admin" };

export default async function AdminBrandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const school = session.schoolId
    ? await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { name: true, logoUrl: true, faviconUrl: true, accentColor: true, plan: true },
      })
    : null;

  const accent = school?.accentColor ?? "#2563eb";
  const isEnterprise = school?.plan === "enterprise";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Branding</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Passe das Erscheinungsbild der Plattform für {school?.name ?? "deine Schule"} an.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-muted-fg" />
            <CardTitle>Schulidentität</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <form action={saveBranding} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="school-name">Schulname</Label>
              <Input id="school-name" name="schoolName" defaultValue={school?.name ?? ""} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo">Schul-Logo</Label>
              {school?.logoUrl && (
                <div className="mb-2 flex items-center gap-3 rounded border border-border bg-surface p-2">
                  <Image
                    src={school.logoUrl}
                    alt="Aktuelles Logo"
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-xs text-muted-fg">Aktuelles Logo</span>
                </div>
              )}
              <Input id="logo" name="logo" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" />
              <p className="text-xs text-muted-fg">PNG, JPEG, SVG oder WebP · max. 2 MB</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accent">Akzentfarbe</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="accent"
                  name="accent"
                  type="color"
                  defaultValue={accent}
                  className="h-10 w-20 cursor-pointer p-1"
                />
                <Input
                  name="accentHex"
                  defaultValue={accent}
                  className="font-mono"
                  placeholder="#2563eb"
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
              {!isEnterprise && (
                <p className="text-xs text-muted-fg">
                  Akzentfarbe wird gespeichert — plattformweite Anwendung erfordert den Enterprise-Plan.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="favicon">Favicon</Label>
              {school?.faviconUrl && (
                <div className="mb-2 flex items-center gap-3 rounded border border-border bg-surface p-2">
                  <Image
                    src={school.faviconUrl}
                    alt="Aktuelles Favicon"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-xs text-muted-fg">Aktuelles Favicon</span>
                </div>
              )}
              <Input id="favicon" name="favicon" type="file" accept=".ico,.png,.svg" />
              <p className="text-xs text-muted-fg">PNG, SVG oder ICO · max. 2 MB</p>
            </div>

            <Button type="submit">Speichern</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vorschau</CardTitle>
        </CardHeader>
        <CardBody>
          {school?.logoUrl ? (
            <div className="flex flex-col items-center gap-4 border border-border bg-surface py-10">
              <Image
                src={school.logoUrl}
                alt={school.name ?? "Logo"}
                width={160}
                height={80}
                className="max-h-20 object-contain"
              />
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="size-4 rounded-full border border-border"
                  style={{ backgroundColor: accent }}
                />
                <span className="font-mono text-xs text-muted-fg">{accent}</span>
              </div>
            </div>
          ) : (
            <div className="grid place-items-center border border-dashed border-border py-12 text-sm text-muted-fg">
              <ImageIcon className="mb-2 size-8 opacity-40" strokeWidth={1.5} />
              Logo hochladen um die Vorschau zu sehen.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
