/* eslint-disable */
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroSection from '@/components/tokenizacao/HeroSection'
import HowItWorks from '@/components/tokenizacao/HowItWorks'
import BenefitsSection from '@/components/tokenizacao/BenefitsSection'
import TokenizedProperties from '@/components/tokenizacao/TokenizedProperties'
import TestimonialsSection from '@/components/tokenizacao/TestimonialsSection'
import CTASection from '@/components/tokenizacao/CTASection'
import StatsSection from '@/components/tokenizacao/StatsSection'

export const metadata: Metadata = {
  title: 'TokenizaÃ§Ã£o de ImÃ³veis | Net ImobiliÃ¡ria TokenizaÃ§Ã£o',
  description: 'Invista em imÃ³veis premium atravÃ©s de tokens digitais. Democratize o acesso ao mercado imobiliÃ¡rio com transparÃªncia e seguranÃ§a blockchain.',
  keywords: 'tokenizaÃ§Ã£o, imÃ³veis, investimento, blockchain, CVM, compliance',
}

export default function TokenizacaoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Stats Section */}
      <StatsSection />
      
      {/* How It Works */}
      <HowItWorks />
      
      {/* Benefits */}
      <BenefitsSection />
      
      {/* Tokenized Properties */}
      <TokenizedProperties />
      
      {/* Testimonials */}
      <TestimonialsSection />
      
      {/* Final CTA */}
      <CTASection />
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

