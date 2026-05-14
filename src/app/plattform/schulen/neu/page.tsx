import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, isSuper } from "@/lib/session";
import { createSchool } from "./actions";

export const metadata: Metadata = { title: "Schule onboarden · Plattform" };

export default async function NeueSchulePage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Link
        href="/plattform/schulen"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Schulen
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Schule onboarden</h1>
        <p className="mt-1 text-sm text-muted-fg">Neue Schule anlegen und Zugang aktivieren.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Schuldaten</CardTitle></CardHeader>
        <CardBody>
          <form action={createSchool} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Schulname *</Label>
                <Input id="name" name="name" placeholder="Realschule Musterstadt" required />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="slug">URL-Slug *</Label>
                <Input id="slug" name="slug" placeholder="realschule-musterstadt" required />
                <p className="text-xs text-muted-fg">Kleinbuchstaben, Bindestriche, eindeutig — wird nicht mehr geändert.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">Stadt</Label>
                <Input id="city" name="city" placeholder="München" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">Bundesland</Label>
                <Input id="state" name="state" placeholder="Bayern" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  name="plan"
                  className="h-10 w-full border border-border bg-bg px-3 text-sm focus:outline-none"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seats">Lizenzsitze</Label>
                <Input id="seats" name="seats" type="number" min="1" max="10000" defaultValue="100" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Schule anlegen</Button>
              <Link
                href="/plattform/schulen"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-muted-fg transition-colors hover:text-fg"
              >
                Abbrechen
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
