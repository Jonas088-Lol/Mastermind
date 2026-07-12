/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";

const RANDOM_NAMES = [
  "Lukas", "Emma", "Leon", "Lena", "Felix", "Hannah", "Noah", "Sofia",
  "Tim", "Laura", "Max", "Anna", "Finn", "Marie", "Jonas", "Lisa",
  "Ben", "Julia", "Paul", "Sarah",
];

export function HeroGreeting({ loggedInName }: { loggedInName: string | null }) {
  // Zufallsname erst NACH dem Mount würfeln — Math.random() im Render liefert
  // auf Server und Client verschiedene Namen (Hydration-Mismatch).
  const [randomName, setRandomName] = useState(RANDOM_NAMES[0]!);
  useEffect(() => {
    setRandomName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]!);
  }, []);

  return <span>Hi {loggedInName ?? randomName} 👋</span>;
}
