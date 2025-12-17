/**
 * ============================================================
 * PERMISSION GUARDS - Sistema de Proteção de UI
 * ============================================================
 * NOVO: 5 níveis granulares (CREATE, READ, UPDATE, DELETE, EXECUTE, ADMIN)
 * ELIMINOU: WRITE (confuso)
 * ============================================================
 */

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionAction } from '@/lib/utils/permissions'

interface PermissionGuardProps {
  resource: string  // Agora aceita qualquer string (slug do banco)
  action: PermissionAction
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
  
  const hasAccess = hasPermission(resource, action)
  
  // Debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔒 PermissionGuard [${resource}] [${action}]:`, hasAccess ? '✅ PERMITIDO' : '❌ NEGADO')
  }
  
  if (!hasAccess) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Exportar PermissionGuard também como named export
export { PermissionGuard }

// ============================================================
// GUARDS ESPECÍFICOS POR AÇÃO (5 níveis granulares)
// ============================================================

export function ReadGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="READ" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CreateGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="CREATE" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function UpdateGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="UPDATE" fallback={fallback}>
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

export function ExecuteGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  return (
    <PermissionGuard resource={resource} action="EXECUTE" fallback={fallback}>
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

/**
 * @deprecated Use CreateGuard ou UpdateGuard
 * WriteGuard foi eliminado - era confuso (mesclava create + update)
 */
export function WriteGuard({ resource, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
  console.warn(`⚠️ WriteGuard está DEPRECATED! Use CreateGuard ou UpdateGuard para ${resource}`)
  // Por ora, mapear para UPDATE (mais restritivo que CREATE)
  return (
    <PermissionGuard resource={resource} action="UPDATE" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

