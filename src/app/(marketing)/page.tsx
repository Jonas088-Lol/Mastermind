import { Hero } from "@/components/landing/Hero";
import { Trust } from "@/components/landing/Trust";
import { Features } from "@/components/landing/Features";
import { Gamification } from "@/components/landing/Gamification";
import { UseCases } from "@/components/landing/UseCases";
import { Pricing } from "@/components/landing/Pricing";
import { Pilot } from "@/components/landing/Pilot";
import { Cta } from "@/components/landing/Cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Trust />
      <Features />
      <Gamification />
      <UseCases />
      <Pricing />
      <Pilot />
      <Cta />
    </>
  );
}
