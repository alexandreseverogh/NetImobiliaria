import { Suspense } from 'react'
import { AuthProvider } from '@/hooks/useAuth'
import AdminLayoutContent from './AdminLayoutContent'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </Suspense>
    </AuthProvider>
  )
}
