import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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

