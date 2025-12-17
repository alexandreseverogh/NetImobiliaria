'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Páginas que não devem ter Header e Footer
  const pagesWithoutHeaderFooter = [
    '/login',
    '/admin/login'
  ]
  
  const shouldShowHeaderFooter = !pagesWithoutHeaderFooter.includes(pathname)
  
  if (shouldShowHeaderFooter) {
    return (
      <>
        <Header />
        {children}
        <Footer />
      </>
    )
  }
  
  // Para páginas de login, mostrar apenas o conteúdo
  return <>{children}</>
}


