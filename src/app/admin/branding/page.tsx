import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Branding · Admin" };

export default async function AdminBrandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const school = session.schoolId
    ? await prisma.school.findUnique({ where: { id: session.schoolId }, select: { name: true } })
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Branding</h1>
        <p className="mt-1 text-sm text-muted-fg">Passe das Erscheinungsbild der Plattform für {school?.name ?? "deine Schule"} an.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-muted-fg" />
            <CardTitle>Schulidentität</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="school-name">Schulname</Label>
              <Input id="school-name" name="schoolName" defaultValue={school?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo">Schul-Logo</Label>
              <Input id="logo" name="logo" type="file" accept=".png,.jpg,.svg" />
              <p className="text-xs text-muted-fg">Empfohlen: SVG oder PNG, mind. 512×512 px</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accent">Akzentfarbe</Label>
              <div className="flex items-center gap-3">
                <Input id="accent" name="accent" type="color" defaultValue="#2563eb" className="h-10 w-20 cursor-pointer p-1" />
                <Input name="accentHex" defaultValue="#2563EB" className="font-mono" placeholder="#2563EB" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="favicon">Favicon</Label>
              <Input id="favicon" name="favicon" type="file" accept=".ico,.png,.svg" />
            </div>
            <Button type="submit">Änderungen speichern</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vorschau</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid place-items-center border border-dashed border-border py-12 text-sm text-muted-fg">
            Logo-Vorschau erscheint nach dem Speichern.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
