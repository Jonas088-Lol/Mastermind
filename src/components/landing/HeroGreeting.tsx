/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useMemo } from "react";

const RANDOM_NAMES = [
  "Lukas", "Emma", "Leon", "Lena", "Felix", "Hannah", "Noah", "Sofia",
  "Tim", "Laura", "Max", "Anna", "Finn", "Marie", "Jonas", "Lisa",
  "Ben", "Julia", "Paul", "Sarah",
];

export function HeroGreeting({ loggedInName }: { loggedInName: string | null }) {
  const name = useMemo(() => {
    if (loggedInName) return loggedInName;
    return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]!;
  }, [loggedInName]);

  return <span>Hi {name} 👋</span>;
}
