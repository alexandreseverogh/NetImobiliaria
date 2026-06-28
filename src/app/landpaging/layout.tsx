import { Playfair_Display } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

/* Fonte display de luxo imobiliário (recomendação do motor ui-ux-pro-max) */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display-imo',
  display: 'swap',
})

export default function LandpagingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={playfair.variable}>
      <Header />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  )
}



