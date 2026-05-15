import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { changePassword, updateNotifPrefs, updateProfile } from "./actions";

export const metadata: Metadata = { title: "Einstellungen · Eltern" };

const NOTIF_KEYS = [
  { key: "teacher_message", label: "Neue Nachricht von Lehrer", defaultChecked: true },
  { key: "grade", label: "Neue Note eingetragen", defaultChecked: true },
  { key: "overdue", label: "Aufgabe überfällig", defaultChecked: true },
  { key: "school_info", label: "Schulinfos & Rundschreiben", defaultChecked: false },
] as const;

export default async function ElternEinstellungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, notifPrefs: true },
  });

  const prefs: Record<string, boolean> = me?.notifPrefs
    ? JSON.parse(me.notifPrefs)
    : {};

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
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={me?.name ?? session.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" defaultValue={me?.email ?? session.email} required />
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
          <form action={updateNotifPrefs} className="space-y-4">
            <ul className="space-y-3 text-sm">
              {NOTIF_KEYS.map(({ key, label, defaultChecked }) => (
                <li key={key} className="flex items-center justify-between">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={key in prefs ? prefs[key] : defaultChecked}
                    className="size-4 accent-brand"
                  />
                </li>
              ))}
            </ul>
            <Button type="submit" variant="outline" size="sm">Einstellungen speichern</Button>
          </form>
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
          <form action={changePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current">Aktuelles Passwort</Label>
              <Input id="current" name="current" type="password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">Neues Passwort</Label>
              <Input id="new" name="new" type="password" minLength={8} required />
            </div>
            <Button type="submit" variant="outline" size="sm">Passwort ändern</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
