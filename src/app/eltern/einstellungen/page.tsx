import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Einstellungen · Eltern" };

export default async function ElternEinstellungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Konto</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Einstellungen</h1>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-fg" />
            <CardTitle>Persönliche Daten</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={session.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" defaultValue={session.email} />
            </div>
            <Button type="submit" variant="outline" size="sm">Speichern</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-fg" />
            <CardTitle>Benachrichtigungen</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Neue Nachricht von Lehrer", checked: true },
              { label: "Neue Note eingetragen", checked: true },
              { label: "Aufgabe überfällig", checked: true },
              { label: "Schulinfos & Rundschreiben", checked: false },
            ].map(({ label, checked }) => (
              <li key={label} className="flex items-center justify-between">
                <span>{label}</span>
                <input type="checkbox" defaultChecked={checked} className="size-4 accent-brand" />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-fg" />
            <CardTitle>Passwort ändern</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current">Aktuelles Passwort</Label>
              <Input id="current" name="current" type="password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">Neues Passwort</Label>
              <Input id="new" name="new" type="password" />
            </div>
            <Button type="submit" variant="outline" size="sm">Passwort ändern</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
