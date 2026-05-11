"use client";

import {
  LandingHeader,
  HeroSection,
  QuoteBridge,
  ShowcaseSection,
  AiInsightPanel,
  FeaturesSection,
  ChannelsSection,
  AgenciesSection,
  PricingSection,
  FinalCtaSection,
  LandingFooter,
} from "@/components/landing/landing-sections";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-aurora" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern opacity-50" />

      <LandingHeader />
      <HeroSection />
      <QuoteBridge />
      <ShowcaseSection />
      <AiInsightPanel />
      <FeaturesSection />
      <ChannelsSection />
      <AgenciesSection />
      <PricingSection />
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
}
