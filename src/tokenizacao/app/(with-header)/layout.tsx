/* eslint-disable */
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function WithHeaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main>
        {children}
      </main>
      <Footer />
    </>
  )
}


