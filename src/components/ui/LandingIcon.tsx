/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { LucideIcon } from "lucide-react";
import {
  Award, BookOpen, Brain, Briefcase, Calendar, CheckCircle2, ClipboardList, Coins,
  Crown, Diamond, FileText, Flame, Gem, Gift, GraduationCap, Heart, Layers,
  Lightbulb, Mail, MessageSquare, Mic, Moon, Music, Package, PenLine, Rocket,
  ShieldCheck, ShoppingBag, Snowflake, Sparkles, Star, Sun, Swords, Target,
  TrendingUp, Trophy, Users, Zap, FlaskConical, Globe2, Building2, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Emoji → lucide-Icon. Quests, Titel & Achievements liefern ihre Symbole als
 * Emoji aus der Datenbank; hier werden sie auf echte Icons abgebildet, damit
 * überall das Landing-Symboldesign (rund, leicht transparent) greift.
 */
const EMOJI_ICON: Record<string, LucideIcon> = {
  // Fortschritt & Auszeichnungen
  "⭐": Star, "🌟": Star, "✨": Sparkles, "💫": Sparkles, "🌠": Sparkles,
  "🏆": Trophy, "🥇": Trophy, "🎖️": Award, "🏅": Award, "👑": Crown,
  "🔥": Flame, "⚡": Zap, "💥": Zap, "🎯": Target, "📈": TrendingUp,
  // Lernen
  "📚": BookOpen, "📖": BookOpen, "📝": PenLine, "✏️": PenLine, "🃏": Layers,
  "🧠": Brain, "🎓": GraduationCap, "💡": Lightbulb, "🧪": FlaskConical,
  // Dokumente & Vorlagen
  "📄": FileText, "📋": ClipboardList, "✅": CheckCircle2, "✉️": Mail,
  "💼": Briefcase, "🏢": Building2, "🎤": Mic, "🚀": Rocket, "📅": Calendar,
  // Spiel & Belohnungen
  "⚔️": Swords, "🛡️": ShieldCheck, "💎": Gem, "💰": Coins, "🪙": Coins,
  "🎁": Gift, "📦": Package, "🛍️": ShoppingBag, "❄️": Snowflake, "🧊": Snowflake,
  "🌈": Sparkles, "🌌": Moon, "🌊": Globe2, "☀️": Sun, "🌙": Moon,
  // Sonstiges
  "💬": MessageSquare, "👥": Users, "👪": Users, "❤️": Heart, "🎵": Music,
  "🐋": Diamond, "👴": Crown, "❓": HelpCircle,
};

/** Fallback, wenn ein Emoji (noch) nicht zugeordnet ist. */
const FALLBACK: LucideIcon = Sparkles;

export function iconForEmoji(emoji: string | null | undefined): LucideIcon {
  if (!emoji) return FALLBACK;
  // Variationsselektoren entfernen (z. B. "✉️" → "✉"), beide Formen prüfen.
  return EMOJI_ICON[emoji] ?? EMOJI_ICON[emoji.replace(/️/g, "")] ?? FALLBACK;
}

interface Props {
  /** Emoji aus den Daten — wird auf ein lucide-Icon abgebildet. */
  emoji?: string | null;
  /** Alternativ direkt ein Icon übergeben. */
  icon?: LucideIcon;
  /** Container-Größe (Tailwind-Klasse), z. B. "size-11". */
  size?: string;
  /** Icon-Größe (Tailwind-Klasse), z. B. "size-5". */
  iconSize?: string;
  className?: string;
}

/**
 * Landing-Symboldesign: lucide-Icon auf voll-rundem, leicht transparentem
 * Markenhintergrund — einheitlich für Achievements, Quests, Titel & Vorlagen.
 */
export function LandingIcon({
  emoji,
  icon,
  size = "size-11",
  iconSize = "size-5",
  className,
}: Props) {
  const Icon = icon ?? iconForEmoji(emoji);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand/10 text-brand",
        size,
        className,
      )}
      aria-hidden
    >
      <Icon className={iconSize} strokeWidth={1.75} />
    </span>
  );
}
