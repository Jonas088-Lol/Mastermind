/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { describe, it, expect } from "vitest";
import { evaluateExpression } from "@/lib/math/evaluate";

function val(expr: string): number {
  const r = evaluateExpression(expr);
  if (!r.ok) throw new Error(`erwartete Zahl, bekam Fehler: ${r.error} (für "${expr}")`);
  return r.value;
}

describe("evaluateExpression — Grundrechenarten", () => {
  it("addiert und subtrahiert", () => {
    expect(val("2+3")).toBe(5);
    expect(val("10-4")).toBe(6);
  });

  it("respektiert Punkt-vor-Strich", () => {
    expect(val("2+3*4")).toBe(14);
    expect(val("2*3+4")).toBe(10);
  });

  it("respektiert Klammern", () => {
    expect(val("(2+3)*4")).toBe(20);
    expect(val("2*(3+4)")).toBe(14);
  });

  it("rechnet Potenzen (rechts-assoziativ)", () => {
    expect(val("2^3")).toBe(8);
    expect(val("2^3^2")).toBe(512); // 2^(3^2), nicht (2^3)^2=64
  });

  it("teilt mit Dezimalergebnis", () => {
    expect(val("10/4")).toBe(2.5);
  });

  it("behandelt unäres Minus", () => {
    expect(val("-5+3")).toBe(-2);
    expect(val("3*-2")).toBe(-6);
  });

  it("vermeidet Gleitkomma-Artefakte", () => {
    expect(val("0.1+0.2")).toBe(0.3);
  });
});

describe("evaluateExpression — Funktionen & Konstanten", () => {
  it("kennt mathematische Funktionen", () => {
    expect(val("sqrt(16)")).toBe(4);
    expect(val("abs(0-5)")).toBe(5);
    expect(val("round(2.6)")).toBe(3);
    expect(val("floor(2.9)")).toBe(2);
    expect(val("ceil(2.1)")).toBe(3);
  });

  it("kennt Konstanten", () => {
    expect(val("pi")).toBeCloseTo(Math.PI, 5);
    expect(val("e")).toBeCloseTo(Math.E, 5);
  });
});

describe("evaluateExpression — LaTeX-Eingaben", () => {
  it("versteht \\frac, \\times, \\cdot, \\div, \\sqrt", () => {
    expect(val("\\frac{6}{2}")).toBe(3);
    expect(val("2\\times3")).toBe(6);
    expect(val("2\\cdot4")).toBe(8);
    expect(val("8\\div2")).toBe(4);
    expect(val("\\sqrt{9}")).toBe(3);
  });
});

describe("evaluateExpression — Gleichungen", () => {
  it("wertet nur die linke Seite vor '=' aus", () => {
    expect(val("2+2=4")).toBe(4);
  });
});

describe("evaluateExpression — Fehlerfälle", () => {
  it("meldet Fehler bei leerer Eingabe", () => {
    expect(evaluateExpression("").ok).toBe(false);
    expect(evaluateExpression("   ").ok).toBe(false);
  });

  it("meldet Fehler bei unvollständigem Ausdruck", () => {
    expect(evaluateExpression("2+").ok).toBe(false);
    expect(evaluateExpression("*5").ok).toBe(false);
  });

  it("meldet Fehler bei ungültigen Zeichen/Namen", () => {
    expect(evaluateExpression("abc(").ok).toBe(false);
    expect(evaluateExpression("2 & 3").ok).toBe(false);
  });

  it("meldet Fehler bei nicht-endlichem Ergebnis (Division durch 0)", () => {
    expect(evaluateExpression("1/0").ok).toBe(false);
  });

  it("meldet Fehler bei unbalancierten Klammern", () => {
    expect(evaluateExpression("(2+3").ok).toBe(false);
    expect(evaluateExpression("2+3)").ok).toBe(false);
  });
});
