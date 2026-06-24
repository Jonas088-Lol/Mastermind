import { Hero } from "@/components/landing/Hero";
import { Trust } from "@/components/landing/Trust";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { Gamification } from "@/components/landing/Gamification";
import { UseCases } from "@/components/landing/UseCases";
import { Pricing } from "@/components/landing/Pricing";
import { Pilot } from "@/components/landing/Pilot";
import { Cta } from "@/components/landing/Cta";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  const loggedInName = session ? session.name.split(" ")[0] ?? null : null;

  return (
    <>
      <Hero loggedInName={loggedInName} />
      <Trust />
      <FeatureShowcase />
      <Gamification />
      <UseCases />
      <Pricing />
      <Pilot />
      <Cta />
    </>
  );
}
