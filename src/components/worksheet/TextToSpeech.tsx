"use client";

import { useState, useCallback, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTextToSpeech(): {
  speak: (text: string, lang?: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
} {
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, lang = "de-DE") => {
      if (!isSupported) return;

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  return { speak, stop, isSpeaking, isSupported };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  text: string;
  lang?: string;
  className?: string;
}

export function TextToSpeech({ text, lang = "de-DE", className }: Props) {
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, lang);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSpeaking ? "Vorlesen stoppen" : "Vorlesen"}
      title={isSpeaking ? "Vorlesen stoppen" : "Vorlesen"}
      className={`flex items-center justify-center text-muted-fg hover:text-fg transition-colors ${className ?? ""}`}
    >
      {isSpeaking ? (
        <VolumeX className="size-4" strokeWidth={1.75} />
      ) : (
        <Volume2 className="size-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
