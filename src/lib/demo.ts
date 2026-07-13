/* Copyright 2026 Elian Schock, Jonas Schwenk */
import "server-only";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/passwords";
import { encryptField, decryptField } from "@/lib/privacy/field-encryption";
import type { Role } from "@/lib/session";

export const DEMO_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage
const DEMO_ENC_CONTEXT = "demo:password";

/** Rollen-Zusammensetzung eines Demo-Zugangs. */
export const DEMO_ROLES: { role: Role; label: string }[] = [
  { role: "student",   label: "Schüler" },
  { role: "student",   label: "Schüler" },
  { role: "teacher",   label: "Lehrkraft" },
  { role: "secretary", label: "Sekretariat" },
  { role: "parent",    label: "Elternteil" },
  { role: "rector",    label: "Schulleitung" },
];

// ── 24-stelliges Passwort (Buchstaben, Zahlen, Sonderzeichen) ──
const PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+?-_";
export function generateDemoPassword(len = 24): string {
  let out = "";
  for (let i = 0; i < len; i++) out += PW_CHARS[randomInt(PW_CHARS.length)];
  return out;
}

// ── Zufällige deutsche Namen (nur zur Immersion, werden nicht angezeigt) ──
const FIRST = ["Lena", "Paul", "Mia", "Ben", "Emma", "Noah", "Lea", "Finn", "Marie", "Elias", "Anna", "Luca", "Sofia", "Jonas", "Clara", "Leon", "Nora", "Felix", "Ida", "Max", "Greta", "Tom", "Hannah", "Jan"];
const LAST = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Krüger", "Braun", "Werner"];
export function randomName(): string {
  return `${FIRST[randomInt(FIRST.length)]} ${LAST[randomInt(LAST.length)]}`;
}

/** Erstellt Demo-Schule + 6 Demo-Accounts + DemoAccess. Gibt das Klartext-Passwort einmalig zurück. */
export async function createDemoAccess(schoolName: string, activatesAt: Date): Promise<{ id: string; password: string }> {
  const name = schoolName.trim().slice(0, 120) || "Demo-Schule";
  const password = generateDemoPassword();
  // Für die Demo-Accounts ein unbrauchbares, zufälliges Passwort (Login läuft über das Demo-Gate).
  const dummyHash = await hashPassword(randomBytes(24).toString("hex"));

  const school = await prisma.school.create({
    data: { slug: `demo-${randomBytes(6).toString("hex")}`, name, plan: "pro" },
    select: { id: true },
  });

  await prisma.schoolClass.create({ data: { name: "Demo 9a", grade: 9, schoolId: school.id } })
    .catch(() => undefined);
  const klasse = await prisma.schoolClass.findFirst({ where: { schoolId: school.id }, select: { id: true } });

  for (let i = 0; i < DEMO_ROLES.length; i++) {
    const { role } = DEMO_ROLES[i];
    const needsClass = role === "student";
    await prisma.user.create({
      data: {
        email: `demo-${school.id}-${i}@demo.local`,
        name: randomName(),
        passwordHash: dummyHash,
        role,
        verifiedAt: new Date(),
        schoolId: school.id,
        classId: needsClass ? klasse?.id ?? null : null,
        klasse: needsClass ? "9a" : null,
      },
    });
  }

  const access = await prisma.demoAccess.create({
    data: {
      schoolName: name,
      passwordEnc: encryptField(password, DEMO_ENC_CONTEXT),
      demoSchoolId: school.id,
      activatesAt,
    },
    select: { id: true },
  });

  return { id: access.id, password };
}

export function decryptDemoPassword(passwordEnc: string): string {
  return decryptField(passwordEnc, DEMO_ENC_CONTEXT) ?? "";
}

export function demoWindow(activatesAt: Date, endsAt?: Date | null) {
  const start = activatesAt.getTime();
  const end = endsAt ? endsAt.getTime() : start + DEMO_DURATION_MS;
  const now = Date.now();
  return {
    start, end,
    pending: now < start,
    active: now >= start && now < end,
    expired: now >= end,
    remainingMs: Math.max(0, end - now),
  };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a); const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Prüft Name + Passwort und ob der Zugang gerade aktiv ist. Gibt Demo + Accounts zurück. */
export async function verifyDemoLogin(schoolName: string, password: string) {
  const name = schoolName.trim();
  if (!name || !password) return null;
  const candidates = await prisma.demoAccess.findMany({
    where: { schoolName: { equals: name } },
    select: { id: true, passwordEnc: true, activatesAt: true, endsAt: true, demoSchoolId: true },
  });
  for (const c of candidates) {
    if (!safeEqual(decryptDemoPassword(c.passwordEnc), password)) continue;
    const win = demoWindow(c.activatesAt, c.endsAt);
    return { id: c.id, demoSchoolId: c.demoSchoolId, window: win };
  }
  return null;
}

/** Demo-Accounts einer Schule (ohne Namen — nur Rolle, für die Auswahlliste). */
export async function listDemoAccounts(demoSchoolId: string) {
  const users = await prisma.user.findMany({
    where: { schoolId: demoSchoolId, email: { endsWith: "@demo.local" } },
    select: { id: true, email: true, role: true },
    orderBy: { email: "asc" },
  });
  const labelFor = (role: string) => DEMO_ROLES.find((r) => r.role === role)?.label ?? role;
  return users.map((u) => ({ id: u.id, role: u.role, label: labelFor(u.role) }));
}
