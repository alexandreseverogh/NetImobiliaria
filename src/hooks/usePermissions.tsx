/**
 * ============================================================
 * USE PERMISSIONS HOOK - Sistema de Permissões Granular
 * ============================================================
 * NOVO: 5 níveis (CREATE, READ, UPDATE, DELETE, EXECUTE, ADMIN)
 * ELIMINOU: WRITE
 * ============================================================
 */

import { useAuth } from './useAuth'
import { hasPermission, canRead, canCreate, canUpdate, canDelete, canExecute, isAdmin, type PermissionAction } from '@/lib/utils/permissions'
import { UserPermissions } from '@/lib/types/admin'

export function usePermissions() {
  const { user } = useAuth()
  
  if (!user || !user.permissoes) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[usePermissions] Usuário não tem permissões:', { 
        user: user?.username, 
        hasPermissoes: !!user?.permissoes
      })
    }
    return {
      canRead: () => false,
      canCreate: () => false,
      canUpdate: () => false,
      canDelete: () => false,
      canExecute: () => false,
      isAdmin: () => false,
      hasPermission: () => false,
      userPermissions: null
    }
  }
  
  const permissions = {
    canRead: (resource: string) => {
      return canRead(user.permissoes || {}, resource)
    },
    canCreate: (resource: string) => {
      return canCreate(user.permissoes || {}, resource)
    },
    canUpdate: (resource: string) => {
      return canUpdate(user.permissoes || {}, resource)
    },
    canDelete: (resource: string) => {
      return canDelete(user.permissoes || {}, resource)
    },
    canExecute: (resource: string) => {
      return canExecute(user.permissoes || {}, resource)
    },
    isAdmin: (resource: string) => {
      return isAdmin(user.permissoes || {}, resource)
    },
    hasPermission: (resource: string, action: PermissionAction) => {
      return hasPermission(user.permissoes || {}, resource, action)
    },
    userPermissions: user.permissoes || {}
  }
  
  return permissions
}

