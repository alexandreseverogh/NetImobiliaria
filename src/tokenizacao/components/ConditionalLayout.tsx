/* eslint-disable */
'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // PÃ¡ginas que nÃ£o devem ter Header e Footer
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
  
  // Para pÃ¡ginas de login, mostrar apenas o conteÃºdo
  return <>{children}</>
}



