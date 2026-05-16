import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Trust } from "@/components/landing/Trust";
import { Features } from "@/components/landing/Features";
import { Gamification } from "@/components/landing/Gamification";
import { UseCases } from "@/components/landing/UseCases";
import { Pricing } from "@/components/landing/Pricing";
import { Pilot } from "@/components/landing/Pilot";
import { Cta } from "@/components/landing/Cta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Trust />
        <Features />
        <Gamification />
        <UseCases />
        <Pricing />
        <Pilot />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
