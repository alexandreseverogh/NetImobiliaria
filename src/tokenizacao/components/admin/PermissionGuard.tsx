/* eslint-disable */
import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserPermissions } from '@/lib/types/admin'

interface PermissionGuardProps {
  resource: keyof UserPermissions
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  children: ReactNode
  fallback?: ReactNode
}

export default function PermissionGuard({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(resource, action)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Componentes especÃ­ficos para facilitar uso
export function ReadGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="READ" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function WriteGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="WRITE" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function DeleteGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="DELETE" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function AdminGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="ADMIN" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}


