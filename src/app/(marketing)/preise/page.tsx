import type { Metadata } from "next";
import { PricingPageClient } from "./_PricingClient";

export const metadata: Metadata = {
  title: "Preise | MasterMind",
  description:
    "Transparente Preise für jede Schulgröße — Basic, Pro und Enterprise. 30 Tage kostenlos testen.",
};

export default function PreisePage() {
  return <PricingPageClient />;
}
