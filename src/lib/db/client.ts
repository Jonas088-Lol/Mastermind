import { PrismaClient } from "@prisma/client";

/**
 * Prisma-Client-Singleton.
 *
 * In development re-evaluiert Next.js Module bei HMR — ohne Singleton entstünde
 * ein neuer Client pro Reload bis SQLite "too many open files" wirft. In
 * Production läuft der Modul-Code einmal pro Worker.
 */
declare global {
  var __mastermindPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__mastermindPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__mastermindPrisma = prisma;
}
