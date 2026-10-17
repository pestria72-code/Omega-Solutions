"use client"

import { LandingNavbar } from "./components/navbar"
import { HeroSection } from "./components/hero-section"
import { FeaturesSection } from "./components/features-section"
import { CTASection } from "./components/cta-section"
import { ContactSection } from "./components/contact-section"
import { FaqSection } from "./components/faq-section"
import { LandingFooter } from "./components/footer"
import { AboutSection } from "./components/about-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <FaqSection />
        <CTASection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  )
}
