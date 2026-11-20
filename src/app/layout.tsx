import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

/* Fonte hospedada no próprio projeto (src/fonts). Não depende de rede no build. */
const inter = localFont({
  src: '../fonts/Inter-latin-var.woff2',
  weight: '100 900',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Imovtec',
  description: 'Sistema de gestão imobiliária Imovitec',
  icons: {
    icon: '/Assets/artemis9/artemis9_favicon_256.png',
    apple: '/Assets/artemis9/artemis9_favicon_256.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}

