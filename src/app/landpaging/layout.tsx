import localFont from 'next/font/local'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

/* Fonte display de luxo imobiliário (recomendação do motor ui-ux-pro-max) */
const playfair = localFont({
  src: '../../fonts/PlayfairDisplay-latin-var.woff2',
  weight: '600 800',
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



