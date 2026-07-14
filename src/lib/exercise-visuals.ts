/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { LucideIcon } from "lucide-react";
import {
  Calculator, Divide, Percent, Shapes, Ruler, TrendingUp, Sigma, Clock, Coins,
  BookOpen, SpellCheck, Languages, PenLine, Quote, MessageSquare,
  Atom, FlaskConical, Leaf, Landmark, Globe2, Cpu, Music, Palette,
  Dumbbell, Scale, Brain, Church, Sprout, Zap, Binary,
} from "lucide-react";

export type ExerciseVisual = { icon: LucideIcon; color: string };

/** Kurze Übungsblöcke — Fragen pro Block, damit eine Übung ~5 Min dauert. */
export const EXERCISE_BLOCK_SIZE = 12;

/** Landing-Symboldesign: farbiges Icon auf leicht-transparentem Hintergrund. */
const KEYWORDS: { match: RegExp; icon: LucideIcon; color: string }[] = [
  // Mathematik
  { match: /bruch/i,                              icon: Divide,          color: "text-sky-500 bg-sky-500/10" },
  { match: /prozent|zins/i,                       icon: Percent,         color: "text-emerald-500 bg-emerald-500/10" },
  { match: /gleichung|term|variable|klammer|binom/i, icon: Binary,       color: "text-indigo-500 bg-indigo-500/10" },
  { match: /geometr|fläche|umfang|volumen|winkel|dreieck|körper|symmetr|maßstab/i, icon: Shapes, color: "text-purple-500 bg-purple-500/10" },
  { match: /einheit|umrechn|länge|gewicht|masse/i, icon: Ruler,          color: "text-orange-500 bg-orange-500/10" },
  { match: /wahrschein|stochast|statist|diagramm|baumdiagramm/i, icon: TrendingUp, color: "text-pink-500 bg-pink-500/10" },
  { match: /ableit|integr|analysis|grenzwert|funktion|tangente/i, icon: Sigma, color: "text-violet-500 bg-violet-500/10" },
  { match: /uhr|zeit/i,                           icon: Clock,           color: "text-amber-500 bg-amber-500/10" },
  { match: /geld|euro|währung/i,                  icon: Coins,           color: "text-yellow-500 bg-yellow-500/10" },
  // Deutsch & Sprachen
  { match: /wortart|grammat|satzglied|fall|kasus|zeitform|konjug|deklinat|konjunktiv/i, icon: SpellCheck, color: "text-amber-500 bg-amber-500/10" },
  { match: /rechtschreib|komma|silb|groß|klein/i, icon: PenLine,         color: "text-rose-500 bg-rose-500/10" },
  { match: /vokab|wortschatz|übersetz|phrasal|präposition|synonym|antonym/i, icon: Languages, color: "text-sky-500 bg-sky-500/10" },
  { match: /argument|erörter|textsort|rhetor|stilmittel|gedicht|literatur|epoche|analyse/i, icon: Quote, color: "text-purple-500 bg-purple-500/10" },
  { match: /textverständ|lesen|text/i,            icon: MessageSquare,   color: "text-teal-500 bg-teal-500/10" },
  // Naturwissenschaften
  { match: /kraft|energie|strom|magnet|optik|welle|mechanik|kinemat|druck|hebel/i, icon: Zap, color: "text-purple-500 bg-purple-500/10" },
  { match: /reaktion|säure|base|salz|element|periodensystem|mol|stoff/i, icon: FlaskConical, color: "text-emerald-500 bg-emerald-500/10" },
  { match: /zelle|pflanze|tier|körper|genetik|ökolog|evolution|photosyn|organ/i, icon: Sprout, color: "text-green-500 bg-green-500/10" },
  // Gesellschaft
  { match: /geschicht|antike|mittelalter|weltkrieg|revolution|epoche/i, icon: Landmark, color: "text-red-500 bg-red-500/10" },
  { match: /erdkunde|geograf|klima|kontinent|hauptstadt|fluss|gebirge|zeitzone/i, icon: Globe2, color: "text-teal-500 bg-teal-500/10" },
  { match: /informatik|programm|python|binär|hex|netzwerk|sql|algorithm/i, icon: Cpu, color: "text-blue-500 bg-blue-500/10" },
  { match: /wirtschaft|angebot|nachfrage|steuer|inflation/i, icon: Scale, color: "text-orange-500 bg-orange-500/10" },
  { match: /musik|note|takt|tonleiter|komponist|intervall/i, icon: Music, color: "text-pink-500 bg-pink-500/10" },
  { match: /kunst|farb|perspektive|epoche|künstler/i, icon: Palette, color: "text-fuchsia-500 bg-fuchsia-500/10" },
  { match: /sport|training|puls|regel/i,         icon: Dumbbell,        color: "text-lime-500 bg-lime-500/10" },
  { match: /ethik|werte|philosoph|religion/i,     icon: Church,          color: "text-slate-500 bg-slate-500/10" },
];

const SUBJECT_FALLBACK: Record<string, ExerciseVisual> = {
  mathematik:   { icon: Calculator,   color: "text-indigo-500 bg-indigo-500/10" },
  deutsch:      { icon: BookOpen,     color: "text-amber-500 bg-amber-500/10" },
  englisch:     { icon: Languages,    color: "text-sky-500 bg-sky-500/10" },
  franzoesisch: { icon: Languages,    color: "text-blue-500 bg-blue-500/10" },
  latein:       { icon: Landmark,     color: "text-amber-600 bg-amber-600/10" },
  spanisch:     { icon: Languages,    color: "text-red-500 bg-red-500/10" },
  physik:       { icon: Atom,         color: "text-purple-500 bg-purple-500/10" },
  chemie:       { icon: FlaskConical, color: "text-emerald-500 bg-emerald-500/10" },
  biologie:     { icon: Leaf,         color: "text-green-500 bg-green-500/10" },
  geschichte:   { icon: Landmark,     color: "text-red-500 bg-red-500/10" },
  erdkunde:     { icon: Globe2,       color: "text-teal-500 bg-teal-500/10" },
  informatik:   { icon: Cpu,          color: "text-blue-500 bg-blue-500/10" },
  wirtschaft:   { icon: Scale,        color: "text-orange-500 bg-orange-500/10" },
  musik:        { icon: Music,        color: "text-pink-500 bg-pink-500/10" },
  kunst:        { icon: Palette,      color: "text-fuchsia-500 bg-fuchsia-500/10" },
  sport:        { icon: Dumbbell,     color: "text-lime-500 bg-lime-500/10" },
  ethik:        { icon: Church,       color: "text-slate-500 bg-slate-500/10" },
  sachkunde:    { icon: Sprout,       color: "text-cyan-500 bg-cyan-500/10" },
  technik:      { icon: Cpu,          color: "text-zinc-500 bg-zinc-500/10" },
  philosophie:  { icon: Brain,        color: "text-violet-500 bg-violet-500/10" },
  psychologie:  { icon: Brain,        color: "text-rose-500 bg-rose-500/10" },
};

/** Icon + Farbe für ein Übungsthema (per Titel-Stichwort, sonst Fach-Fallback). */
export function topicVisual(subject: string, title: string): ExerciseVisual {
  for (const k of KEYWORDS) {
    if (k.match.test(title)) return { icon: k.icon, color: k.color };
  }
  return SUBJECT_FALLBACK[subject] ?? { icon: Brain, color: "text-brand bg-brand/10" };
}
