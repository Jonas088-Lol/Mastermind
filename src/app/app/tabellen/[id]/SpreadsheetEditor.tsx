/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import {
  useCallback, useEffect, useRef, useState, useTransition,
} from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, BarChart3, Bold, ChevronDown,
  Download, Italic, Plus, Trash2, Underline,
} from "lucide-react";
import Link from "next/link";
import { saveSpreadsheetData, renameSpreadsheet, deleteSpreadsheet } from "../actions";
import { ChartCard, ChartDialog, extractChartData, type ChartDef } from "./SpreadsheetCharts";
import { OfficeThemeMenu, useOfficeTheme } from "@/components/office/OfficeTheme";
import { evaluateExpression } from "@/lib/math/evaluate";

// ── Sichere Bedingungs-Auswertung für WENN/IF (kein new Function/eval) ───────
// Erwartet einen bereits ref-aufgelösten Ausdruck, z.B. `5>3` oder `"a"="a"`.
function evalConditionSide(s: string): number | string {
  const t = s.trim();
  const q = t.match(/^"([\s\S]*)"$/);
  if (q) return q[1];
  const r = evaluateExpression(t);
  return r.ok ? r.value : t.replace(/^"|"$/g, "");
}
function safeCondition(cond: string): boolean {
  const m = cond.match(/^([\s\S]+?)\s*(>=|<=|<>|!=|==|=|>|<)\s*([\s\S]+)$/);
  if (!m) {
    const v = evalConditionSide(cond);
    return typeof v === "number" ? v !== 0 : v !== "" && !/^(falsch|false)$/i.test(v);
  }
  const lhs = evalConditionSide(m[1]);
  const rhs = evalConditionSide(m[3]);
  const op = m[2];
  if (typeof lhs === "number" && typeof rhs === "number") {
    switch (op) {
      case ">":  return lhs > rhs;
      case "<":  return lhs < rhs;
      case ">=": return lhs >= rhs;
      case "<=": return lhs <= rhs;
      case "=": case "==": return lhs === rhs;
      case "<>": case "!=": return lhs !== rhs;
    }
  }
  // Textvergleich wie in Excel: Groß-/Kleinschreibung ignorieren
  const ls = String(lhs).toLowerCase(), rs = String(rhs).toLowerCase();
  switch (op) {
    case "=": case "==": return ls === rs;
    case "<>": case "!=": return ls !== rs;
    case ">":  return ls > rs;
    case "<":  return ls < rs;
    case ">=": return ls >= rs;
    case "<=": return ls <= rs;
  }
  return false;
}

// ── Types ──────────────────────────────────────────────────────────────────

type NumFmt = "general" | "number" | "currency" | "percent" | "date";
type Align  = "left" | "center" | "right";

interface CellData {
  v:      string;
  bold?:  boolean;
  italic?: boolean;
  under?: boolean;
  color?: string;
  bg?:    string;
  align?: Align;
  fmt?:   NumFmt;
  bTop?: boolean; bRight?: boolean; bBottom?: boolean; bLeft?: boolean;
}

interface SheetDef {
  name: string;
  cols: number;
  rows: number;
  cells: Record<string, CellData>;
  colWidths: Record<string, number>;
  rowHeights: Record<string, number>;
  charts?: ChartDef[];
}

interface WorkbookData {
  sheets: SheetDef[];
  active: number;
}

const DEFAULT_SHEET = (): SheetDef => ({ name: "Tabelle1", cols: 26, rows: 50, cells: {}, colWidths: {}, rowHeights: {} });

function parseData(json: string): WorkbookData {
  try {
    const d = JSON.parse(json) as Partial<WorkbookData & SheetDef>;
    // Legacy flat format
    if (d.cells && !d.sheets) {
      return { sheets: [{ name: "Tabelle1", cols: d.cols ?? 26, rows: d.rows ?? 50, cells: d.cells ?? {}, colWidths: d.colWidths ?? {}, rowHeights: {} }], active: 0 };
    }
    if (d.sheets && Array.isArray(d.sheets) && d.sheets.length > 0) {
      return { sheets: d.sheets, active: d.active ?? 0 };
    }
  } catch { /* ignore */ }
  return { sheets: [DEFAULT_SHEET()], active: 0 };
}

// ── Formula engine ─────────────────────────────────────────────────────────

function colToIndex(col: string): number {
  let idx = 0;
  for (const ch of col.toUpperCase()) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

function indexToCol(idx: number): string {
  let col = "", n = idx + 1;
  while (n > 0) { n--; col = String.fromCharCode(65 + (n % 26)) + col; n = Math.floor(n / 26); }
  return col;
}

function cellRefToKey(ref: string): string {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return "";
  return `${parseInt(m[2]) - 1},${colToIndex(m[1])}`;
}

function getRangeKeys(from: string, to: string): string[] {
  const mf = from.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  const mt = to.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!mf || !mt) return [];
  const r1 = parseInt(mf[2]) - 1, c1 = colToIndex(mf[1]);
  const r2 = parseInt(mt[2]) - 1, c2 = colToIndex(mt[1]);
  const keys: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
      keys.push(`${r},${c}`);
  return keys;
}

function splitFnArgs(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0, inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') inStr = !inStr;
    if (!inStr) {
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if ((ch === "," || ch === ";") && depth === 0) {
        parts.push(s.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  const last = s.slice(start).trim();
  if (last !== "") parts.push(last);
  return parts;
}

function testCond(val: string, condStr: string): boolean {
  const cond = condStr.trim().replace(/^["']|["']$/g, "");
  const m = cond.match(/^(>=|<=|<>|!=|>|<|=)(.*)$/);
  if (m) {
    const [, op, right] = m;
    const rv = isNaN(Number(right)) ? right : Number(right);
    const lv = isNaN(Number(val)) ? val : Number(val);
    if (op === ">")  return (lv as number) >  (rv as number);
    if (op === "<")  return (lv as number) <  (rv as number);
    if (op === ">=") return (lv as number) >= (rv as number);
    if (op === "<=") return (lv as number) <= (rv as number);
    if (op === "<>" || op === "!=") return lv !== rv;
    if (op === "=")  return lv === rv;
  }
  const pattern = "^" + cond.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*").replace(/\\\?/g, ".") + "$";
  return new RegExp(pattern, "i").test(val);
}

function evaluateCell(key: string, cells: Record<string, CellData>, depth = 0): string {
  if (depth > 50) return "#LOOP";
  const cell = cells[key];
  if (!cell?.v) return "";
  const v = cell.v;
  if (!v.startsWith("=")) return v;

  const exprRaw = v.slice(1).trim();
  const exprUp  = exprRaw.toUpperCase();

  const resVal = (arg: string): string => {
    const a = arg.trim();
    if (a.startsWith('"') && a.endsWith('"')) return a.slice(1, -1);
    if (/^[A-Z]+\d+$/i.test(a)) return evaluateCell(cellRefToKey(a.toUpperCase()), cells, depth + 1);
    const n = Number(a);
    return isNaN(n) ? a : String(n);
  };
  const resNum = (arg: string): number => Number(resVal(arg));

  const getArr = (arg: string): string[] => {
    const a = arg.trim().toUpperCase();
    const rm = a.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
    if (rm) return getRangeKeys(rm[1], rm[2]).map(k => evaluateCell(k, cells, depth + 1));
    if (/^[A-Z]+\d+$/.test(a)) return [evaluateCell(cellRefToKey(a), cells, depth + 1)];
    return [resVal(arg)];
  };
  const getNums = (arg: string): number[] => getArr(arg).map(Number).filter(n => !isNaN(n));

  const fnMatch = exprRaw.match(/^([A-Za-zÀ-ſ]+)\(([\s\S]*)\)$/);
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase();
    const args = splitFnArgs(fnMatch[2]);

    switch (fn) {
      // Aggregation
      case "SUMME": case "SUM": {
        let s = 0; for (const a of args) getNums(a).forEach(n => { s += n; }); return String(r(s));
      }
      case "MITTELWERT": case "AVERAGE": {
        const ns = args.flatMap(getNums);
        return ns.length ? String(r(ns.reduce((a, b) => a + b, 0) / ns.length)) : "0";
      }
      case "MIN": { const ns = args.flatMap(getNums); return ns.length ? String(Math.min(...ns)) : "0"; }
      case "MAX": { const ns = args.flatMap(getNums); return ns.length ? String(Math.max(...ns)) : "0"; }
      case "ANZAHL": case "COUNT": return String(args.flatMap(getNums).length);
      case "ANZAHL2": case "COUNTA": return String(args.flatMap(getArr).filter(x => x !== "").length);
      case "PRODUKT": case "PRODUCT": { let p = 1; args.flatMap(getNums).forEach(n => { p *= n; }); return String(r(p)); }

      // Logical
      case "WENN": case "IF": {
        const [condArg, trueArg = "0", falseArg = "0"] = args;
        // String-Literale unangetastet lassen: kein toUpperCase über den ganzen
        // Ausdruck (sonst wird `A1="ja"` zu `"ja"="JA"` und "AB1" in Anführungs-
        // zeichen fälschlich als Zellbezug ersetzt).
        const resolveRefs = (s: string) => s.replace(/"[^"]*"|[A-Za-z]+\d+/g, tok => {
          if (tok.startsWith('"')) return tok;
          const val = evaluateCell(cellRefToKey(tok.toUpperCase()), cells, depth + 1);
          const num = Number(val);
          return isNaN(num) ? `"${val}"` : String(num);
        });
        try {
          const ok = safeCondition(resolveRefs(condArg));
          const raw = (ok ? trueArg : falseArg).trim().replace(/^"(.*)"$/, "$1");
          if (/^[A-Z]+\d+$/i.test(raw)) return evaluateCell(cellRefToKey(raw.toUpperCase()), cells, depth + 1);
          const num = Number(raw);
          return isNaN(num) ? raw : String(r(num));
        } catch { return "#ERR"; }
      }
      case "WENNFEHLER": case "IFERROR": {
        const res = resVal(args[0] ?? ""); return res.startsWith("#") ? resVal(args[1] ?? '""') : res;
      }
      case "UND": case "AND": {
        const ok = args.every(a => { const v2 = resVal(a); return v2 !== "" && v2 !== "0" && !/^(falsch|false)$/i.test(v2); });
        return ok ? "WAHR" : "FALSCH";
      }
      case "ODER": case "OR": {
        const ok = args.some(a => { const v2 = resVal(a); return v2 !== "" && v2 !== "0" && !/^(falsch|false)$/i.test(v2); });
        return ok ? "WAHR" : "FALSCH";
      }
      case "NICHT": case "NOT": {
        const v2 = resVal(args[0] ?? ""); const t = v2 !== "" && v2 !== "0" && !/^(falsch|false)$/i.test(v2);
        return t ? "FALSCH" : "WAHR";
      }
      case "WAHR": case "TRUE":  return "WAHR";
      case "FALSCH": case "FALSE": return "FALSCH";
      case "ISTLEER": case "ISBLANK":   return resVal(args[0] ?? "") === "" ? "WAHR" : "FALSCH";
      case "ISTZAHL": case "ISNUMBER": { const v2 = resVal(args[0] ?? ""); return !isNaN(Number(v2)) && v2 !== "" ? "WAHR" : "FALSCH"; }
      case "ISTTEXT": case "ISTEXT":   { const v2 = resVal(args[0] ?? ""); return (isNaN(Number(v2)) || v2 === "") ? "WAHR" : "FALSCH"; }
      case "ISTFEHLER": case "ISERROR": return resVal(args[0] ?? "").startsWith("#") ? "WAHR" : "FALSCH";

      // Lookup & Reference
      case "SVERWEIS": case "VLOOKUP": {
        if (args.length < 3) return "#WERT!";
        const lookup = resVal(args[0]);
        const rangeStr = args[1].trim().toUpperCase();
        const colIdx = Math.floor(resNum(args[2]));
        const isExact = args[3] ? /^(0|falsch|false)$/i.test(resVal(args[3])) : false;
        const rm = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!rm) return "#BEZUG!";
        const r1 = parseInt(rm[2]) - 1, c1 = colToIndex(rm[1]);
        const r2 = parseInt(rm[4]) - 1, c2 = colToIndex(rm[3]);
        for (let row = r1; row <= r2; row++) {
          const cv = evaluateCell(`${row},${c1}`, cells, depth + 1);
          const match = isExact ? cv.toLowerCase() === lookup.toLowerCase() : testCond(cv, `=${lookup}`);
          if (match) { const tc = c1 + colIdx - 1; return tc > c2 ? "#BEZUG!" : evaluateCell(`${row},${tc}`, cells, depth + 1); }
        }
        return "#NV";
      }
      case "XVERWEIS": case "XLOOKUP": {
        if (args.length < 3) return "#WERT!";
        const lookup = resVal(args[0]);
        const searchVals = getArr(args[1]), returnVals = getArr(args[2]);
        const notFound = args[3] ? resVal(args[3]) : "#NV";
        const idx = searchVals.findIndex(sv => sv.toLowerCase() === lookup.toLowerCase());
        return idx < 0 ? notFound : (returnVals[idx] ?? "");
      }
      case "INDEX": {
        if (args.length < 2) return "#WERT!";
        const rm = args[0].trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!rm) return "#BEZUG!";
        const r1 = parseInt(rm[2]) - 1, c1 = colToIndex(rm[1]);
        const ro = Math.floor(resNum(args[1])) - 1, co = args[2] ? Math.floor(resNum(args[2])) - 1 : 0;
        return evaluateCell(`${r1 + ro},${c1 + co}`, cells, depth + 1);
      }
      case "VERGLEICH": case "MATCH": {
        if (args.length < 2) return "#WERT!";
        const lookup = resVal(args[0]), vals = getArr(args[1]);
        const idx = vals.findIndex(v2 => v2.toLowerCase() === lookup.toLowerCase());
        return idx >= 0 ? String(idx + 1) : "#NV";
      }
      case "WAHL": case "CHOOSE": {
        const idx = Math.floor(resNum(args[0]));
        return idx >= 1 && idx < args.length ? resVal(args[idx]) : "#WERT!";
      }

      // Conditional aggregation
      case "SUMMEWENN": case "SUMIF": {
        if (args.length < 2) return "#WERT!";
        const rv = getArr(args[0]), crit = resVal(args[1]), sv = args[2] ? getArr(args[2]) : rv;
        let s = 0;
        for (let i = 0; i < rv.length; i++) { if (testCond(rv[i], crit)) { const n = Number(sv[i]); if (!isNaN(n)) s += n; } }
        return String(r(s));
      }
      case "ZÄHLENWENN": case "COUNTIF": {
        if (args.length < 2) return "#WERT!";
        return String(getArr(args[0]).filter(v2 => testCond(v2, resVal(args[1]))).length);
      }
      case "MITTELWERTWENN": case "AVERAGEIF": {
        if (args.length < 2) return "#WERT!";
        const rv = getArr(args[0]), crit = resVal(args[1]), av = args[2] ? getArr(args[2]) : rv;
        const matching: number[] = [];
        for (let i = 0; i < rv.length; i++) { if (testCond(rv[i], crit)) { const n = Number(av[i]); if (!isNaN(n)) matching.push(n); } }
        return matching.length ? String(r(matching.reduce((a, b) => a + b, 0) / matching.length)) : "0";
      }

      // Math
      case "RUNDEN": case "ROUND":      { const n = resNum(args[0] ?? "0"), d = resNum(args[1] ?? "0"), f = Math.pow(10, d); return String(Math.round(n * f) / f); }
      case "AUFRUNDEN": case "ROUNDUP": { const n = resNum(args[0] ?? "0"), d = resNum(args[1] ?? "0"), f = Math.pow(10, d); return String(Math.ceil(n * f) / f); }
      case "ABRUNDEN": case "ROUNDDOWN":{ const n = resNum(args[0] ?? "0"), d = resNum(args[1] ?? "0"), f = Math.pow(10, d); return String(Math.floor(n * f) / f); }
      case "GANZZAHL": case "INT":      return String(Math.floor(resNum(args[0] ?? "0")));
      case "ABS":                       return String(Math.abs(resNum(args[0] ?? "0")));
      case "VORZEICHEN": case "SIGN":   return String(Math.sign(resNum(args[0] ?? "0")));
      case "REST": case "MOD":          return String(r(resNum(args[0] ?? "0") % resNum(args[1] ?? "1")));
      case "WURZEL": case "SQRT":       return String(r(Math.sqrt(resNum(args[0] ?? "0"))));
      case "POTENZ": case "POWER":      return String(r(Math.pow(resNum(args[0] ?? "0"), resNum(args[1] ?? "1"))));
      case "EXP":    return String(r(Math.exp(resNum(args[0] ?? "0"))));
      case "LN":     return String(r(Math.log(resNum(args[0] ?? "0"))));
      case "LOG10":  return String(r(Math.log10(resNum(args[0] ?? "0"))));
      case "LOG": { const base = args[1] ? resNum(args[1]) : 10; return String(r(Math.log(resNum(args[0] ?? "0")) / Math.log(base))); }
      case "PI":     return String(Math.PI);
      case "KGRÖSSTE": case "LARGE": { const ns = getNums(args[0] ?? "").sort((a, b) => b - a); return String(ns[resNum(args[1] ?? "1") - 1] ?? "#ZAHL!"); }
      case "KKLEINSTE": case "SMALL": { const ns = getNums(args[0] ?? "").sort((a, b) => a - b); return String(ns[resNum(args[1] ?? "1") - 1] ?? "#ZAHL!"); }

      // Text
      case "LINKS": case "LEFT":   return resVal(args[0] ?? "").slice(0, resNum(args[1] ?? "1"));
      case "RECHTS": case "RIGHT": { const s = resVal(args[0] ?? ""), n = resNum(args[1] ?? "1"); return s.slice(Math.max(0, s.length - n)); }
      case "TEIL": case "MID":     { const s = resVal(args[0] ?? ""), st = resNum(args[1] ?? "1") - 1, ln = resNum(args[2] ?? "1"); return s.slice(st, st + ln); }
      case "LÄNGE": case "LEN":    return String(resVal(args[0] ?? "").length);
      case "GROSS": case "UPPER":  return resVal(args[0] ?? "").toUpperCase();
      case "KLEIN": case "LOWER":  return resVal(args[0] ?? "").toLowerCase();
      case "GROSS2": case "PROPER": return resVal(args[0] ?? "").toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
      case "GLÄTTEN": case "TRIM": return resVal(args[0] ?? "").trim();
      case "VERKETTEN": case "CONCATENATE": case "CONCAT": return args.map(a => resVal(a)).join("");
      case "TEXTVERKETTEN": case "TEXTJOIN": {
        const delim = resVal(args[0] ?? ""), ignEmpty = /^(1|wahr|true)$/i.test(resVal(args[1] ?? "0"));
        const vals = args.slice(2).flatMap(getArr);
        return (ignEmpty ? vals.filter(v2 => v2 !== "") : vals).join(delim);
      }
      case "WECHSELN": case "SUBSTITUTE": {
        const s = resVal(args[0] ?? ""), from = resVal(args[1] ?? ""), to = resVal(args[2] ?? "");
        return s.split(from).join(to);
      }
      case "WIEDERHOLEN": case "REPT": return resVal(args[0] ?? "").repeat(Math.max(0, resNum(args[1] ?? "0")));
      case "SUCHEN": case "SEARCH": {
        const find = resVal(args[0] ?? ""), within = resVal(args[1] ?? ""), st = resNum(args[2] ?? "1") - 1;
        const idx = within.toLowerCase().indexOf(find.toLowerCase(), st);
        return idx >= 0 ? String(idx + 1) : "#WERT!";
      }
      case "FINDEN": case "FIND": {
        const find = resVal(args[0] ?? ""), within = resVal(args[1] ?? ""), st = resNum(args[2] ?? "1") - 1;
        const idx = within.indexOf(find, st);
        return idx >= 0 ? String(idx + 1) : "#WERT!";
      }
      case "WERT": case "VALUE":   return String(Number(resVal(args[0] ?? "").replace(",", ".")));
      case "TEXT":                 return String(resNum(args[0] ?? "0"));
      case "ZEICHEN": case "CHAR": return String.fromCharCode(resNum(args[0] ?? "65"));
      case "CODE":                 return String((resVal(args[0] ?? "") || "\0").charCodeAt(0));

      // Date/Time
      case "HEUTE": case "TODAY": {
        const d = new Date();
        return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()}`;
      }
      case "JETZT": case "NOW": return new Date().toLocaleString("de-DE");
      case "JAHR":  case "YEAR":    { const d = new Date(resVal(args[0] ?? "")); return isNaN(d.getTime()) ? "#WERT!" : String(d.getFullYear()); }
      case "MONAT": case "MONTH":   { const d = new Date(resVal(args[0] ?? "")); return isNaN(d.getTime()) ? "#WERT!" : String(d.getMonth() + 1); }
      case "TAG":   case "DAY":     { const d = new Date(resVal(args[0] ?? "")); return isNaN(d.getTime()) ? "#WERT!" : String(d.getDate()); }
      case "STUNDE": case "HOUR":   { const d = new Date(resVal(args[0] ?? "")); return isNaN(d.getTime()) ? "#WERT!" : String(d.getHours()); }
      case "MINUTE":                { const d = new Date(resVal(args[0] ?? "")); return isNaN(d.getTime()) ? "#WERT!" : String(d.getMinutes()); }
      case "WOCHENTAG": case "WEEKDAY": { const d = new Date(resVal(args[0] ?? "")); return isNaN(d.getTime()) ? "#WERT!" : String(d.getDay() + 1); }

      // Financial
      case "BW": case "PV": {
        if (args.length < 3) return "#WERT!";
        const rate = resNum(args[0]), nper = resNum(args[1]), pmt = resNum(args[2]);
        const fv = args[3] ? resNum(args[3]) : 0, type = args[4] ? resNum(args[4]) : 0;
        if (rate === 0) return String(r(-(pmt * nper + fv)));
        const pvF = (1 - Math.pow(1 + rate, -nper)) / rate;
        return String(r(-(pmt * pvF * (1 + rate * type) + fv * Math.pow(1 + rate, -nper))));
      }
      case "ZW": case "FV": {
        if (args.length < 3) return "#WERT!";
        const rate = resNum(args[0]), nper = resNum(args[1]), pmt = resNum(args[2]);
        const pv = args[3] ? resNum(args[3]) : 0, type = args[4] ? resNum(args[4]) : 0;
        if (rate === 0) return String(r(-(pmt * nper + pv)));
        return String(r(-(pmt * ((Math.pow(1 + rate, nper) - 1) / rate) * (1 + rate * type) + pv * Math.pow(1 + rate, nper))));
      }
      case "RMZ": case "PMT": {
        if (args.length < 3) return "#WERT!";
        const rate = resNum(args[0]), nper = resNum(args[1]), pv = resNum(args[2]);
        const fv = args[3] ? resNum(args[3]) : 0, type = args[4] ? resNum(args[4]) : 0;
        if (rate === 0) return String(r(-(pv + fv) / nper));
        return String(r(-(pv * Math.pow(1 + rate, nper) + fv) * rate / ((Math.pow(1 + rate, nper) - 1) * (1 + rate * type))));
      }
      case "ZINS": case "RATE": {
        if (args.length < 3) return "#WERT!";
        const nper = resNum(args[0]), pmt = resNum(args[1]), pv = resNum(args[2]);
        const fv = args[3] ? resNum(args[3]) : 0;
        let rate = args[5] ? resNum(args[5]) : 0.1;
        for (let i = 0; i < 100; i++) {
          const pow = Math.pow(1 + rate, nper);
          const f = pv * pow + pmt * (rate === 0 ? nper : (pow - 1) / rate) + fv;
          const df = nper * pv * Math.pow(1 + rate, nper - 1) + (rate === 0 ? pmt * nper : pmt * ((nper * Math.pow(1 + rate, nper - 1) * rate - (pow - 1)) / (rate * rate)));
          if (!df) break;
          const nr = rate - f / df;
          if (Math.abs(nr - rate) < 1e-10) { rate = nr; break; }
          rate = nr;
        }
        return String(r(rate));
      }
      case "IKV": case "IRR": {
        if (!args[0]) return "#WERT!";
        const vals = getNums(args[0]);
        let rate = args[1] ? resNum(args[1]) : 0.1;
        for (let i = 0; i < 100; i++) {
          let f = 0, df = 0;
          vals.forEach((val2, j) => { const p = Math.pow(1 + rate, j); f += val2 / p; df -= j * val2 / (p * (1 + rate)); });
          if (!df) break;
          const nr = rate - f / df;
          if (Math.abs(nr - rate) < 1e-10) { rate = nr; break; }
          rate = nr;
        }
        return String(r(rate));
      }
      case "NBW": case "NPV": {
        const rate2 = resNum(args[0] ?? "0.1");
        return String(r(args.slice(1).flatMap(getNums).reduce((acc, v2, i) => acc + v2 / Math.pow(1 + rate2, i + 1), 0)));
      }

      default: return "#NAME?";
    }
  }

  // Arithmetic expression with cell refs.
  // WICHTIG: kein new Function/eval — die Produktions-CSP hat kein 'unsafe-eval',
  // dort würde jede Formel mit #ERR fehlschlagen. evaluateExpression ist eval-frei.
  const resolved = exprUp.replace(/[A-Z]+\d+/g, ref => {
    const val = evaluateCell(cellRefToKey(ref), cells, depth + 1);
    const num = Number(val);
    return isNaN(num) ? "0" : String(num);
  });
  const evalRes = evaluateExpression(resolved);
  if (evalRes.ok) return String(r(evalRes.value));
  return "#ERR";
}

function r(n: number): number { return Math.round(n * 1_000_000) / 1_000_000; }

function formatDisplay(raw: string, evaluated: string, fmt: NumFmt = "general"): string {
  if (raw.startsWith("=")) {
    const num = Number(evaluated);
    if (!isNaN(num)) return applyFmt(num, fmt);
    return evaluated;
  }
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return applyFmt(num, fmt);
  return raw;
}

function applyFmt(n: number, fmt: NumFmt): string {
  if (fmt === "currency") return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  if (fmt === "percent")  return (n / 100).toLocaleString("de-DE", { style: "percent", minimumFractionDigits: 1 });
  if (fmt === "number")   return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (fmt === "date")     { const d = new Date(n * 86400000); return isNaN(d.getTime()) ? String(n) : d.toLocaleDateString("de-DE"); }
  return String(n);
}

// ── Context menu ───────────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; row: number; col: number; }

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COL_W = 90;
const ROW_H = 22;
const HDR_H = 24;
const ROW_NUM_W = 42;
// Excel-Gefühl: großes Grid. Zeilen werden virtualisiert gerendert (nur der
// sichtbare Ausschnitt), daher kostet die Größe keine Performance.
const MIN_ROWS = 1_000;
const MIN_COLS = 52;
const GROW_ROWS = 500;
const GROW_COLS = 26;
const OVERSCAN = 12;

// ── Main component ─────────────────────────────────────────────────────────

interface Props { spreadsheetId: string; initialTitle: string; initialData: string; }

export function SpreadsheetEditor({ spreadsheetId, initialTitle, initialData }: Props) {
  const [wb, setWb]           = useState<WorkbookData>(() => parseData(initialData));
  const [title, setTitle]     = useState(initialTitle);
  const [editTitle, setEditTitle] = useState(false);
  const [sel, setSel]         = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [ctx, setCtx]         = useState<CtxMenu | null>(null);
  const [resizing, setResizing] = useState<{ col: number; startX: number; startW: number } | null>(null);
  const [, startTr]           = useTransition();
  const saveTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zuletzt gespeicherter Titel — Vergleich mit initialTitle würde ein
  // Zurück-Umbenennen auf den Ursprungstitel verschlucken.
  const savedTitle            = useRef(initialTitle);
  const cellInputRef          = useRef<HTMLInputElement>(null);
  const fbarRef               = useRef<HTMLInputElement>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  const sheet = wb.sheets[wb.active] ?? wb.sheets[0];
  const { cols, rows, cells } = sheet;

  // ── Virtuelles Grid: nur sichtbare Zeilen rendern, wächst beim Scrollen ──
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(600);
  const [extraRows, setExtraRows] = useState(0);
  const [extraCols, setExtraCols] = useState(0);

  const displayRows = Math.max(rows, MIN_ROWS) + extraRows;
  const displayCols = Math.max(cols, MIN_COLS) + extraCols;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function handleGridScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    // Wie in Excel: am Rand wächst das Grid einfach weiter
    if (el.scrollTop + el.clientHeight > displayRows * ROW_H - 300) setExtraRows((x) => x + GROW_ROWS);
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - 200) setExtraCols((x) => x + GROW_COLS);
  }

  const vStart = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const vEnd = Math.min(displayRows, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);

  // ── Save ────────────────────────────────────────────────────────────────

  const triggerSave = useCallback((next: WorkbookData) => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      startTr(async () => {
        await saveSpreadsheetData(spreadsheetId, JSON.stringify(next));
        setSaveStatus("saved");
      });
    }, 800);
  }, [spreadsheetId]);

  function updateSheet(patch: Partial<SheetDef>) {
    setWb((prev) => {
      const sheets = prev.sheets.map((s, i) => i === prev.active ? { ...s, ...patch } : s);
      const next = { ...prev, sheets };
      triggerSave(next);
      return next;
    });
  }

  // ── Cell ops ─────────────────────────────────────────────────────────────

  function key(row: number, col: number) { return `${row},${col}`; }

  function getEval(row: number, col: number): string {
    const k = key(row, col);
    const c = cells[k];
    if (!c?.v) return "";
    if (c.v.startsWith("=")) return evaluateCell(k, cells);
    return c.v;
  }

  function getRaw(row: number, col: number): string { return cells[key(row, col)]?.v ?? ""; }

  function getCell(row: number, col: number): CellData | undefined { return cells[key(row, col)]; }

  function setCell(row: number, col: number, value: string) {
    const k = key(row, col);
    const nextCells = { ...cells };
    if (value === "") {
      const existing = nextCells[k];
      if (existing) {
        const { v: _, ...rest } = existing;
        if (Object.keys(rest).length > 0) nextCells[k] = rest as CellData;
        else delete nextCells[k];
      }
    } else {
      nextCells[k] = { ...nextCells[k], v: value };
    }
    updateSheet({ cells: nextCells });
  }

  function patchCell(row: number, col: number, patch: Partial<CellData>) {
    const k = key(row, col);
    const nextCells = { ...cells, [k]: { ...cells[k], ...patch } };
    updateSheet({ cells: nextCells });
  }

  function patchSel(patch: Partial<CellData>) {
    if (!sel) return;
    patchCell(sel.r, sel.c, patch);
  }

  // ── Edit commit ──────────────────────────────────────────────────────────

  function commitEdit() {
    if (editing !== null && sel) setCell(sel.r, sel.c, editing);
    setEditing(null);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────

  function handleCellKey(e: React.KeyboardEvent, row: number, col: number) {
    if (editing !== null) {
      if (e.key === "Enter")  { e.preventDefault(); commitEdit(); setSel({ r: Math.min(row + 1, displayRows - 1), c: col }); }
      if (e.key === "Escape") { setEditing(null); }
      if (e.key === "Tab")    { e.preventDefault(); commitEdit(); setSel({ r: row, c: Math.min(col + 1, displayCols - 1) }); }
      return;
    }
    const mv = (dr: number, dc: number) => { e.preventDefault(); setSel({ r: Math.max(0, Math.min(displayRows - 1, row + dr)), c: Math.max(0, Math.min(displayCols - 1, col + dc)) }); };
    if (e.key === "ArrowUp")    mv(-1, 0);
    if (e.key === "ArrowDown")  mv(1, 0);
    if (e.key === "ArrowLeft")  mv(0, -1);
    if (e.key === "ArrowRight") mv(0, 1);
    if (e.key === "Tab")    { e.preventDefault(); mv(0, 1); }
    if (e.key === "Enter")  { e.preventDefault(); setEditing(getRaw(row, col)); setTimeout(() => cellInputRef.current?.focus(), 0); }
    if (e.key === "F2")     { setEditing(getRaw(row, col)); setTimeout(() => cellInputRef.current?.focus(), 0); }
    if (e.key === "Delete" || e.key === "Backspace") setCell(row, col, "");
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // preventDefault ist Pflicht: React flusht den State synchron und fokussiert
      // das Editier-Input noch VOR der nativen Texteingabe-Phase — ohne preventDefault
      // fügt der Browser das Zeichen dann ein zweites Mal ein ("A" → "AA").
      e.preventDefault();
      setEditing(e.key);
      setTimeout(() => cellInputRef.current?.focus(), 0);
    }
  }

  useEffect(() => {
    if (sel && editing === null) document.getElementById(`cell-${sel.r}-${sel.c}`)?.focus();
  }, [sel, editing]);

  // ── Context menu ──────────────────────────────────────────────────────────

  function openCtx(e: React.MouseEvent, row: number, col: number) {
    e.preventDefault();
    setSel({ r: row, c: col });
    setCtx({ x: e.clientX, y: e.clientY, row, col });
  }

  useEffect(() => {
    if (!ctx) return;
    const h = () => setCtx(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [ctx]);

  function insertRow(above: boolean) {
    const targetRow = above ? ctx!.row : ctx!.row + 1;
    const nextCells: Record<string, CellData> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (r >= targetRow) nextCells[`${r + 1},${c}`] = v;
      else nextCells[k] = v;
    });
    const nextRows = Math.max(rows, sheet.rows + 1);
    updateSheet({ cells: nextCells, rows: nextRows });
    setCtx(null);
  }

  function deleteRow() {
    const targetRow = ctx!.row;
    const nextCells: Record<string, CellData> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (r < targetRow) nextCells[k] = v;
      else if (r > targetRow) nextCells[`${r - 1},${c}`] = v;
    });
    updateSheet({ cells: nextCells, rows: Math.max(1, rows - 1) });
    setCtx(null);
  }

  function insertCol(left: boolean) {
    const targetCol = left ? ctx!.col : ctx!.col + 1;
    const nextCells: Record<string, CellData> = {};
    const nextWidths: Record<string, number> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (c >= targetCol) nextCells[`${r},${c + 1}`] = v;
      else nextCells[k] = v;
    });
    Object.entries(sheet.colWidths).forEach(([ci, w]) => {
      const c = Number(ci);
      if (c >= targetCol) nextWidths[String(c + 1)] = w;
      else nextWidths[ci] = w;
    });
    updateSheet({ cells: nextCells, colWidths: nextWidths, cols: cols + 1 });
    setCtx(null);
  }

  function deleteCol() {
    const targetCol = ctx!.col;
    const nextCells: Record<string, CellData> = {};
    const nextWidths: Record<string, number> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (c < targetCol) nextCells[k] = v;
      else if (c > targetCol) nextCells[`${r},${c - 1}`] = v;
    });
    Object.entries(sheet.colWidths).forEach(([ci, w]) => {
      const c = Number(ci);
      if (c < targetCol) nextWidths[ci] = w;
      else if (c > targetCol) nextWidths[String(c - 1)] = w;
    });
    updateSheet({ cells: nextCells, colWidths: nextWidths, cols: Math.max(1, cols - 1) });
    setCtx(null);
  }

  // ── Spalte sortieren ───────────────────────────────────────────────────
  // Sortiert alle benutzten Zeilen (Zeilen mit mind. einer befüllten Zelle)
  // stabil nach der Spalte. Styles wandern mit der Zeile mit.
  function sortColumn(colIdx: number, asc: boolean) {
    setCtx(null);
    const rowSet = new Set<number>();
    Object.entries(cells).forEach(([k, cd]) => { if (cd?.v) rowSet.add(Number(k.split(",")[0])); });
    const usedRows = [...rowSet].sort((a, b) => a - b);
    if (usedRows.length < 2) return;
    const valOf = (r0: number) => evaluateCell(`${r0},${colIdx}`, cells);
    // Array.prototype.sort ist stabil — Zeilen mit gleichem Wert behalten ihre Reihenfolge
    const sorted = [...usedRows].sort((ra, rb) => {
      const va = valOf(ra), vb = valOf(rb);
      if (va === "" && vb === "") return 0;
      if (va === "") return 1;  // leere Zellen immer ans Ende
      if (vb === "") return -1;
      const na = Number(va), nb = Number(vb);
      const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : va.localeCompare(vb, "de");
      return asc ? cmp : -cmp;
    });
    const nextCells: Record<string, CellData> = {};
    Object.entries(cells).forEach(([k, cd]) => {
      const [r0, c0] = k.split(",").map(Number);
      const pos = sorted.indexOf(r0);
      if (pos < 0) nextCells[k] = cd;                     // Zeile ohne Inhalt: bleibt
      else nextCells[`${usedRows[pos]},${c0}`] = cd;      // ganze Zeile (inkl. Styles) wandert
    });
    updateSheet({ cells: nextCells });
  }

  // ── Nach unten ausfüllen ───────────────────────────────────────────────
  // Kopiert Wert+Format der Zelle in die leere Lücke darunter bis zur
  // nächsten befüllten Zelle; relative A1-Bezüge in Formeln werden pro Zeile verschoben.
  function fillDown() {
    const { row, col } = ctx!;
    setCtx(null);
    const src = cells[key(row, col)];
    if (!src?.v) return;
    let maxR = -1;
    Object.entries(cells).forEach(([k, cd]) => { if (cd?.v) maxR = Math.max(maxR, Number(k.split(",")[0])); });
    const nextCells = { ...cells };
    let changed = false;
    for (let r0 = row + 1; r0 <= maxR; r0++) {
      if (cells[key(r0, col)]?.v) break; // Lücke endet an der nächsten befüllten Zelle
      const offset = r0 - row;
      let v2 = src.v;
      if (v2.startsWith("=")) {
        // (?![\d(]) verhindert, dass Funktionsnamen mit Ziffern (LOG10, ANZAHL2, …)
        // als Zellbezug verschoben werden (aus =LOG10(A1) würde sonst =LOG11(A2)).
        v2 = v2.replace(/([A-Z]+)(\d+)(?![\d(])/gi, (_, c1: string, n: string) => `${c1}${parseInt(n) + offset}`);
      }
      nextCells[key(r0, col)] = { ...src, v: v2 };
      changed = true;
    }
    if (changed) updateSheet({ cells: nextCells });
  }

  // ── Farbskala für Spalte ───────────────────────────────────────────────
  // Numerische Zellen der Spalte: bg von rot (Min) über gelb nach grün (Max),
  // einmalig berechnet und als normale Formate gespeichert.
  function applyColorScale(colIdx: number) {
    setCtx(null);
    const entries: { k: string; n: number }[] = [];
    Object.entries(cells).forEach(([k, cd]) => {
      if (Number(k.split(",")[1]) !== colIdx || !cd?.v) return;
      const ev = cd.v.startsWith("=") ? evaluateCell(k, cells) : cd.v;
      const n = Number(ev);
      if (ev !== "" && !isNaN(n)) entries.push({ k, n });
    });
    if (entries.length === 0) return;
    const min = Math.min(...entries.map((e) => e.n));
    const max = Math.max(...entries.map((e) => e.n));
    const span = max - min || 1;
    const C_R = [248, 113, 113], C_Y = [253, 224, 71], C_G = [74, 222, 128];
    const mix = (a: number[], b: number[], x: number) => a.map((v3, i) => Math.round(v3 + (b[i] - v3) * x));
    const toHex = (rgb: number[]) => "#" + rgb.map((v3) => v3.toString(16).padStart(2, "0")).join("");
    const nextCells = { ...cells };
    entries.forEach(({ k, n }) => {
      const t = (n - min) / span;
      const rgb = t < 0.5 ? mix(C_R, C_Y, t * 2) : mix(C_Y, C_G, (t - 0.5) * 2);
      nextCells[k] = { ...nextCells[k], bg: toHex(rgb) };
    });
    updateSheet({ cells: nextCells });
  }

  function clearColorScale(colIdx: number) {
    setCtx(null);
    const nextCells: Record<string, CellData> = {};
    let changed = false;
    Object.entries(cells).forEach(([k, cd]) => {
      if (Number(k.split(",")[1]) === colIdx && cd?.bg) {
        const { bg: _bg, ...rest } = cd;
        changed = true;
        if (Object.keys(rest).length > 0) nextCells[k] = rest as CellData;
      } else {
        nextCells[k] = cd;
      }
    });
    if (changed) updateSheet({ cells: nextCells });
  }

  // ── Column resize ──────────────────────────────────────────────────────

  function startResize(e: React.MouseEvent, col: number) {
    e.preventDefault();
    e.stopPropagation();
    const startW = sheet.colWidths[String(col)] ?? DEFAULT_COL_W;
    setResizing({ col, startX: e.clientX, startW });
  }

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => {
      const w = Math.max(30, resizing.startW + e.clientX - resizing.startX);
      updateSheet({ colWidths: { ...sheet.colWidths, [String(resizing.col)]: w } });
    };
    const up = () => setResizing(null);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing]);

  // ── Sheets ────────────────────────────────────────────────────────────

  function addSheet() {
    const n = wb.sheets.length + 1;
    const next = { ...wb, sheets: [...wb.sheets, { ...DEFAULT_SHEET(), name: `Tabelle${n}` }], active: wb.sheets.length };
    setWb(next);
    triggerSave(next);
  }

  function switchSheet(i: number) {
    setWb((prev) => ({ ...prev, active: i }));
    setSel(null); setEditing(null);
  }

  // ── CSV Export ────────────────────────────────────────────────────────

  function exportCsv() {
    // Export bis zur letzten tatsächlich befüllten Zelle (Grid ist virtuell riesig)
    let maxR = 0, maxC = 0;
    Object.keys(cells).forEach((k) => {
      const [r0, c0] = k.split(",").map(Number);
      if (cells[k]?.v) { maxR = Math.max(maxR, r0 + 1); maxC = Math.max(maxC, c0 + 1); }
    });
    const expRows = Math.max(1, maxR), expCols = Math.max(1, maxC);
    const lines: string[] = [];
    for (let rr = 0; rr < expRows; rr++) {
      const row: string[] = [];
      for (let cc = 0; cc < expCols; cc++) {
        const val = getEval(rr, cc);
        row.push(val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val);
      }
      lines.push(row.join(","));
    }
    while (lines.length > 0 && lines[lines.length - 1].replace(/,/g, "") === "") lines.pop();
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Title ─────────────────────────────────────────────────────────────

  function commitTitle() {
    const val = title.trim() || "Unbenannte Tabelle";
    setTitle(val); setEditTitle(false);
    if (val !== savedTitle.current) {
      savedTitle.current = val;
      startTr(() => renameSpreadsheet(spreadsheetId, val));
    }
  }

  function handleDelete() {
    if (!confirm(`Tabelle "${title}" wirklich löschen?`)) return;
    startTr(() => deleteSpreadsheet(spreadsheetId));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const cellLabel = sel ? `${indexToCol(sel.c)}${sel.r + 1}` : "";
  const fbarValue = editing !== null ? editing : (sel ? getRaw(sel.r, sel.c) : "");
  const selCell   = sel ? getCell(sel.r, sel.c) : undefined;

  // ── Format toolbar helpers ────────────────────────────────────────────────

  const FBtn = ({ active, onClick, title: t, children }: { active?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} title={t}
      className={`grid place-items-center rounded px-1.5 py-0.5 text-xs transition-colors ${active ? "bg-brand/15 text-brand" : "text-gray-600 hover:bg-gray-100"}`}>
      {children}
    </button>
  );

  const NUM_FMTS: { label: string; value: NumFmt }[] = [
    { label: "Standard", value: "general" }, { label: "Zahl", value: "number" },
    { label: "Währung", value: "currency" }, { label: "Prozent", value: "percent" },
    { label: "Datum", value: "date" },
  ];

  const [chartDlg, setChartDlg] = useState(false);
  const [freezeR1, setFreezeR1] = useState(false);
  const charts = sheet.charts ?? [];

  function addChart(def: Omit<ChartDef, "id">) {
    updateSheet({ charts: [...charts, { ...def, id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}` }] });
  }
  function removeChart(id: string) {
    updateSheet({ charts: charts.filter((c) => c.id !== id) });
  }

  const { mode: officeMode, setMode: setOfficeMode, officeClasses } = useOfficeTheme();
  const [fmtDrop, setFmtDrop] = useState(false);
  const fmtRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!fmtRef.current?.contains(e.target as Node)) setFmtDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Zeilen-Rendering (auch für fixierte Zeile 1) ─────────────────────────
  // Bei aktivierter Fixierung wird Zeile 0 aus der Virtualisierung ausgenommen
  // und einmal sticky unter dem Spalten-Header gerendert.
  const firstBodyRow = freezeR1 ? 1 : 0;
  const bodyStart = Math.max(vStart, firstBodyRow);

  const renderRow = (rr: number, frozen = false) => (
    <tr key={frozen ? "frozen-0" : rr} style={{ height: ROW_H }}>
      <td className={`sheet-hdr sticky left-0 border text-center text-[10px] font-semibold select-none ${frozen ? "z-40" : "z-10"}`}
        style={{
          top: frozen ? HDR_H : undefined,
          backgroundColor: sel?.r === rr ? "var(--sheet-sel)" : (frozen ? "var(--sheet-bg)" : undefined),
        }}>
        {rr + 1}
      </td>
      {Array.from({ length: displayCols }, (_, cc) => {
        const k = key(rr, cc);
        const isSel = sel?.r === rr && sel?.c === cc;
        const isEd  = isSel && editing !== null;
        const cellDef = cells[k];
        const raw     = cellDef?.v ?? "";
        const evaluated = raw.startsWith("=") ? evaluateCell(k, cells) : raw;
        const display   = formatDisplay(raw, evaluated, cellDef?.fmt);
        const isErr     = display === "#ERR" || display === "#LOOP";
        const isFormula = raw.startsWith("=");
        const numVal    = !raw.startsWith("=") && !isNaN(Number(raw)) && raw !== "";
        const borderStyle = {
          borderTopWidth:    cellDef?.bTop    ? "2px" : undefined,
          borderRightWidth:  cellDef?.bRight  ? "2px" : undefined,
          borderBottomWidth: cellDef?.bBottom ? "2px" : undefined,
          borderLeftWidth:   cellDef?.bLeft   ? "2px" : undefined,
          borderTopColor:    cellDef?.bTop    ? "var(--sheet-border-strong)" : undefined,
          borderRightColor:  cellDef?.bRight  ? "var(--sheet-border-strong)" : undefined,
          borderBottomColor: cellDef?.bBottom ? "var(--sheet-border-strong)" : undefined,
          borderLeftColor:   cellDef?.bLeft   ? "var(--sheet-border-strong)" : undefined,
        };
        return (
          <td
            key={cc}
            id={`cell-${rr}-${cc}`}
            tabIndex={0}
            onFocus={() => { if (!isSel) setSel({ r: rr, c: cc }); }}
            onClick={() => { if (!isSel) { setSel({ r: rr, c: cc }); setEditing(null); } }}
            onDoubleClick={() => { setEditing(raw); setTimeout(() => cellInputRef.current?.focus(), 0); }}
            onKeyDown={(e) => handleCellKey(e, rr, cc)}
            onContextMenu={(e) => openCtx(e, rr, cc)}
            className={`relative border focus:outline-none cursor-default select-none overflow-hidden ${frozen ? "sticky" : ""}`}
            style={{
              ...(frozen ? { top: HDR_H, zIndex: 15 } : {}),
              backgroundColor: isSel
                ? "var(--sheet-sel)"
                : (cellDef?.bg && cellDef.bg !== "#ffffff" ? cellDef.bg : (frozen ? "var(--sheet-bg)" : undefined)),
              color: isErr ? "#ef4444" : (cellDef?.color ?? (isFormula ? "var(--sheet-formula)" : "var(--sheet-fg)")),
              fontWeight: cellDef?.bold ? "bold" : undefined,
              fontStyle: cellDef?.italic ? "italic" : undefined,
              textDecoration: cellDef?.under ? "underline" : undefined,
              textAlign: cellDef?.align ?? (numVal ? "right" : "left"),
              fontSize: 12,
              ...borderStyle,
              ...(isSel ? { outline: "2px solid #14b8a6", outlineOffset: "-1px" } : {}),
            }}
          >
            {isEd ? (
              <input
                ref={cellInputRef}
                value={editing}
                onChange={(e) => setEditing(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitEdit(); setSel({ r: Math.min(rr + 1, displayRows - 1), c: cc }); }
                  if (e.key === "Escape") setEditing(null);
                  if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSel({ r: rr, c: Math.min(cc + 1, displayCols - 1) }); }
                }}
                className="absolute inset-0 w-full px-1 font-mono text-[12px] focus:outline-none border-0 z-10"
                style={{ backgroundColor: "var(--sheet-bg)", color: "var(--sheet-fg)" }}
                autoFocus
              />
            ) : (
              <span className="block truncate px-1">{display}</span>
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className={`office-shell ${officeClasses} -mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden lg:-mx-10 lg:-mb-10 lg:-mt-10`}>

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-1.5 shadow-sm">
        <Link href="/app/tabellen" className="grid size-8 place-items-center text-gray-400 hover:text-gray-700">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          {editTitle ? (
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(savedTitle.current); setEditTitle(false); } }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none" />
          ) : (
            <button type="button" onClick={() => setEditTitle(true)} className="truncate text-sm font-semibold hover:text-brand">{title}</button>
          )}
        </div>
        <span className="font-mono text-[10px] text-gray-400">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "●" : "✓"}
        </span>
        <OfficeThemeMenu mode={officeMode} setMode={setOfficeMode} />
        <button type="button" onClick={exportCsv} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50" title="CSV exportieren">
          <Download className="size-3.5" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={handleDelete} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:text-red-500" title="Löschen">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Format toolbar ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-3 py-1">
        <FBtn active={selCell?.bold}   onClick={() => patchSel({ bold:  !selCell?.bold })}  title="Fett"><Bold      className="size-3" /></FBtn>
        <FBtn active={selCell?.italic} onClick={() => patchSel({ italic: !selCell?.italic })} title="Kursiv"><Italic    className="size-3" /></FBtn>
        <FBtn active={selCell?.under}  onClick={() => patchSel({ under:  !selCell?.under })}  title="Unterstreichen"><Underline className="size-3" /></FBtn>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <FBtn active={selCell?.align === "left"}   onClick={() => patchSel({ align: "left" })}   title="Links"><AlignLeft   className="size-3" /></FBtn>
        <FBtn active={selCell?.align === "center"} onClick={() => patchSel({ align: "center" })} title="Mitte"><AlignCenter className="size-3" /></FBtn>
        <FBtn active={selCell?.align === "right"}  onClick={() => patchSel({ align: "right" })}  title="Rechts"><AlignRight  className="size-3" /></FBtn>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Text color */}
        <div className="relative flex items-center">
          <span className="mr-1 text-[10px] text-gray-400">A</span>
          <input type="color" value={selCell?.color ?? "#000000"} onChange={(e) => patchSel({ color: e.target.value })}
            className="size-4 cursor-pointer rounded border-0 bg-transparent p-0" title="Textfarbe" />
        </div>
        {/* Fill color */}
        <div className="relative flex items-center">
          <span className="mr-1 text-[10px] text-gray-400">Füllung</span>
          <input type="color" value={selCell?.bg ?? "#ffffff"} onChange={(e) => patchSel({ bg: e.target.value })}
            className="size-4 cursor-pointer rounded border-0 bg-transparent p-0" title="Hintergrundfarbe" />
        </div>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Borders */}
        {(["bTop", "bRight", "bBottom", "bLeft"] as const).map((b, i) => {
          const labels = ["↑", "→", "↓", "←"];
          return (
            <FBtn key={b} active={selCell?.[b]} onClick={() => patchSel({ [b]: !selCell?.[b] })} title={`Rahmen ${labels[i]}`}>
              <span className="font-mono text-[10px]">{labels[i]}</span>
            </FBtn>
          );
        })}
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Number format */}
        <div ref={fmtRef} className="relative">
          <button type="button" onClick={() => setFmtDrop((v) => !v)}
            className="flex h-6 items-center gap-1 rounded border border-gray-200 px-2 text-[10px] text-gray-600 hover:bg-gray-50">
            {NUM_FMTS.find((f) => f.value === selCell?.fmt)?.label ?? "Standard"} <ChevronDown className="size-2.5" />
          </button>
          {fmtDrop && (
            <div className="absolute top-full left-0 z-50 mt-1 min-w-28 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {NUM_FMTS.map((f) => (
                <button key={f.value} type="button" onClick={() => { patchSel({ fmt: f.value }); setFmtDrop(false); }}
                  className={`w-full px-3 py-1 text-left text-[10px] hover:bg-gray-50 ${selCell?.fmt === f.value ? "font-semibold text-brand" : ""}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Chart insert */}
        <button type="button" onClick={() => setChartDlg(true)}
          className="flex h-6 items-center gap-1 rounded border border-gray-200 px-2 text-[10px] text-gray-600 hover:bg-gray-50" title="Diagramm einfügen">
          <BarChart3 className="size-3" strokeWidth={1.75} /> Diagramm
        </button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Zeile 1 fixieren */}
        <button type="button" onClick={() => setFreezeR1((v) => !v)}
          className={`flex h-6 items-center gap-1 rounded border px-2 text-[10px] ${freezeR1 ? "border-brand/40 bg-brand/15 text-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          title="Zeile 1 fixieren">
          Zeile 1 fixieren
        </button>
      </div>

      {/* ── Formula bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-0.5">
        <div className="grid h-6 w-14 shrink-0 place-items-center border border-gray-200 bg-gray-50 font-mono text-[10px] font-semibold text-gray-500">
          {cellLabel}
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <input
          ref={fbarRef}
          value={fbarValue}
          onChange={(e) => { if (sel) setEditing(e.target.value); }}
          onFocus={() => { if (sel && editing === null) setEditing(getRaw(sel.r, sel.c)); }}
          onBlur={() => { if (editing !== null && sel) commitEdit(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit(); } if (e.key === "Escape") setEditing(null); }}
          placeholder="Wert oder =Formel eingeben"
          className="flex-1 bg-transparent font-mono text-xs focus:outline-none text-gray-800 placeholder:text-gray-300"
        />
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      <div ref={containerRef} onScroll={handleGridScroll} className="sheet-grid flex-1 overflow-auto">
        <table className="border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: ROW_NUM_W }} />
            {Array.from({ length: displayCols }, (_, c) => (
              <col key={c} style={{ width: sheet.colWidths[String(c)] ?? DEFAULT_COL_W }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: HDR_H }}>
              <th className="sticky left-0 top-0 border text-[10px] z-30" />
              {Array.from({ length: displayCols }, (_, c) => (
                <th key={c} className="sticky top-0 border text-center text-[11px] font-semibold select-none z-20"
                  style={{ backgroundColor: sel?.c === c ? "var(--sheet-sel)" : undefined }}>
                  {indexToCol(c)}
                  {/* resize handle */}
                  <span
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 bg-brand"
                    onMouseDown={(e) => startResize(e, c)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Fixierte Zeile 1: immer gerendert, sticky unter dem Spalten-Header */}
            {freezeR1 && renderRow(0, true)}
            {/* Spacer oben: Höhe der nicht gerenderten Zeilen davor (ohne fixierte Zeile) */}
            {bodyStart > firstBodyRow && <tr style={{ height: (bodyStart - firstBodyRow) * ROW_H }} aria-hidden />}
            {Array.from({ length: Math.max(0, vEnd - bodyStart) }, (_, vi) => bodyStart + vi).map((rr) => renderRow(rr))}
            {/* Spacer unten: restliche Zeilen bis displayRows */}
            {vEnd < displayRows && <tr style={{ height: (displayRows - vEnd) * ROW_H }} aria-hidden />}
          </tbody>
        </table>
      </div>

      {/* ── Diagramm-Leiste ──────────────────────────────────────────────────── */}
      {charts.length > 0 && (
        <div className="flex shrink-0 gap-3 overflow-x-auto border-t border-gray-200 bg-gray-50 p-3">
          {charts.map((c) => (
            <ChartCard
              key={c.id}
              chart={c}
              data={extractChartData(c.range, getEval)}
              onDelete={() => removeChart(c.id)}
            />
          ))}
        </div>
      )}

      {/* ── Diagramm-Dialog ──────────────────────────────────────────────────── */}
      {chartDlg && (
        <ChartDialog
          initialRange={sel ? `A1:${indexToCol(sel.c)}${sel.r + 1}` : "A1:B5"}
          onInsert={addChart}
          onClose={() => setChartDlg(false)}
        />
      )}

      {/* ── Sheet tabs ────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center border-t border-gray-200 bg-gray-50">
        <div className="flex flex-1 items-end gap-0 overflow-x-auto">
          {wb.sheets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => switchSheet(i)}
              onDoubleClick={() => {
                const name = prompt("Tabellenname:", s.name);
                if (name) {
                  const sheets = wb.sheets.map((sh, j) => j === i ? { ...sh, name } : sh);
                  const next = { ...wb, sheets };
                  setWb(next); triggerSave(next);
                }
              }}
              className={`flex items-center gap-1.5 border-r border-gray-200 px-4 py-1.5 text-[11px] transition-colors whitespace-nowrap
                ${i === wb.active ? "bg-white font-semibold text-brand border-t-2 border-t-brand" : "text-gray-500 hover:bg-white hover:text-gray-800"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={addSheet} className="grid size-8 shrink-0 place-items-center text-gray-400 hover:text-brand" title="Neue Tabelle">
          <Plus className="size-3.5" strokeWidth={2} />
        </button>
        <div className="px-3 font-mono text-[10px] text-gray-400">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "●" : displayCols + " Sp · " + displayRows + " Z"}
        </div>
      </div>

      {/* ── Context menu ──────────────────────────────────────────────────────── */}
      {ctx && (
        <div
          className="fixed z-999 min-w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl"
          style={{ top: ctx.y, left: ctx.x }}
        >
          {[
            { label: "Zeile darüber einfügen", action: () => insertRow(true) },
            { label: "Zeile darunter einfügen", action: () => insertRow(false) },
            { label: "Zeile löschen", action: deleteRow },
            { label: "—", action: null },
            { label: "Spalte links einfügen", action: () => insertCol(true) },
            { label: "Spalte rechts einfügen", action: () => insertCol(false) },
            { label: "Spalte löschen", action: deleteCol },
            { label: "—", action: null },
            { label: "Spalte aufsteigend sortieren", action: () => sortColumn(ctx.col, true) },
            { label: "Spalte absteigend sortieren", action: () => sortColumn(ctx.col, false) },
            { label: "Nach unten ausfüllen", action: fillDown },
            { label: "—", action: null },
            { label: "Farbskala für Spalte", action: () => applyColorScale(ctx.col) },
            { label: "Farbskala entfernen", action: () => clearColorScale(ctx.col) },
          ].map((item, i) =>
            item.action === null ? (
              <div key={i} className="my-0.5 h-px bg-gray-100" />
            ) : (
              <button key={i} type="button" onClick={item.action}
                className="w-full px-4 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
