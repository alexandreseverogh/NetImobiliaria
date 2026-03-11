import { Suspense } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { PageTracker } from '@/components/analytics/PageTracker'

export default function WithHeaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      {/* PageTracker: componente invisível de analytics — fire-and-forget, nunca impacta o usuário */}
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      <main>
        {children}
      </main>
      <Footer />
    </>
  )
}


