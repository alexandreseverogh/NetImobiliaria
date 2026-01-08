/* eslint-disable */
import { AuthProvider } from '@/hooks/useAuth'
import AdminLayoutContent from './AdminLayoutContent'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AuthProvider>
  )
}

