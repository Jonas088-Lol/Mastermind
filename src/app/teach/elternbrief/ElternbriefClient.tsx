"use client";

import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { generateElternbrief } from "./actions";

const ANLAESSE = [
  { value: "Ausflug", label: "Ausflug / Wandertag" },
  { value: "Elternabend", label: "Elternabend" },
  { value: "Materialliste", label: "Materialliste" },
  { value: "Verhalten", label: "Verhalten" },
  { value: "Frei", label: "Freier Anlass" },
];

export function ElternbriefClient({ aiConfigured }: { aiConfigured: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleGenerate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await generateElternbrief(formData);
      if (res.ok && res.text) {
        setText(res.text);
        setIsMock(Boolean(res.mock));
      } else {
        setError(res.error ?? "Unbekannter Fehler beim Generieren.");
      }
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard nicht verfügbar — ignorieren
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Eckdaten</CardTitle>
          <Badge variant="brand">
            <Sparkles className="size-3" />
            KI
          </Badge>
        </CardHeader>
        <CardBody>
          <form action={handleGenerate} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="eb-anlass">Anlass</Label>
              <select
                id="eb-anlass"
                name="anlass"
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                {ANLAESSE.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eb-stichpunkte">Stichpunkte</Label>
              <textarea
                id="eb-stichpunkte"
                name="stichpunkte"
                required
                rows={7}
                maxLength={3000}
                className="w-full resize-y rounded-xl border border-border bg-bg p-2.5 text-sm focus:border-fg/30 focus:outline-none"
                placeholder={"z. B.\n- Ausflug in den Zoo am 12.05.\n- Treffpunkt 8:00 Uhr Schulhof\n- 5 € Eintritt mitgeben\n- Rückkehr ca. 13:30 Uhr"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eb-ton">Tonfall</Label>
              <select
                id="eb-ton"
                name="ton"
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="formell">Formell</option>
                <option value="freundlich">Freundlich</option>
              </select>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {pending ? "Generiert …" : "Brief generieren"}
            </Button>

            {error && (
              <p className="text-center text-xs font-semibold text-danger">{error}</p>
            )}
            {!aiConfigured && (
              <p className="text-center text-[10px] uppercase tracking-wider text-muted-fg">
                KI nicht konfiguriert — es wird eine Beispiel-Antwort erzeugt.
              </p>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Entwurf</CardTitle>
            {isMock && text && (
              <p className="mt-1 text-xs text-warning">Mock-Modus — kein echter KI-Text.</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!text}>
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Kopiert" : "Kopieren"}
          </Button>
        </CardHeader>
        <CardBody>
          {text ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={20}
              className="w-full resize-y rounded-xl border border-border bg-bg p-3 text-sm leading-relaxed focus:border-fg/30 focus:outline-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Sparkles className="size-10 text-muted-fg" strokeWidth={1.5} />
              <p className="text-base font-semibold">Noch kein Entwurf</p>
              <p className="max-w-sm text-sm text-muted-fg">
                Wähle einen Anlass, gib Stichpunkte ein und klicke auf <strong>Brief generieren</strong>.
                Den Entwurf kannst du hier direkt bearbeiten.
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
