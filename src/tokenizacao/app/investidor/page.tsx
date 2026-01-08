/* eslint-disable */
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import InvestorDashboard from '@/components/investor/InvestorDashboard'

export const metadata: Metadata = {
  title: 'Portal do Investidor | Net ImobiliÃ¡ria TokenizaÃ§Ã£o',
  description: 'Acesse seu portal de investidor e gerencie seus tokens de imÃ³veis. Visualize sua carteira, dividendos e performance.',
  keywords: 'portal investidor, carteira tokens, dividendos, performance, investimentos',
}

export default function InvestorPortalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-16">
        <InvestorDashboard />
      </main>
      
      <Footer />
    </div>
  )
}


