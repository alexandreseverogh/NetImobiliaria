/* eslint-disable */
import { useAuth } from './useAuth'
import { hasPermission, canRead, canWrite, canDelete, isAdmin } from '@/lib/utils/permissions'
import { UserPermissions } from '@/lib/types/admin'

export function usePermissions() {
  const { user } = useAuth()
  
  console.log('ðŸ” usePermissions: user:', user)
  console.log('ðŸ” usePermissions: user.permissoes:', user?.permissoes)
  
  if (!user) {
    console.log('ðŸ” usePermissions: UsuÃ¡rio nÃ£o logado')
    return {
      canRead: () => false,
      canWrite: () => false,
      canDelete: () => false,
      isAdmin: () => false,
      hasPermission: () => false,
      userPermissions: null
    }
  }
  
  const permissions = {
    canRead: (resource: keyof UserPermissions) => {
      const result = canRead(user.permissoes, resource)
      console.log(`ðŸ” usePermissions: canRead(${resource}):`, result)
      return result
    },
    canWrite: (resource: keyof UserPermissions) => {
      const result = canWrite(user.permissoes, resource)
      console.log(`ðŸ” usePermissions: canWrite(${resource}):`, result)
      return result
    },
    canDelete: (resource: keyof UserPermissions) => {
      const result = canDelete(user.permissoes, resource)
      console.log(`ðŸ” usePermissions: canDelete(${resource}):`, result)
      return result
    },
    isAdmin: (resource: keyof UserPermissions) => {
      const result = isAdmin(user.permissoes, resource)
      console.log(`ðŸ” usePermissions: isAdmin(${resource}):`, result)
      return result
    },
    hasPermission: (resource: keyof UserPermissions, action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN') => {
      const result = hasPermission(user.permissoes, resource, action)
      console.log(`ðŸ” usePermissions: hasPermission(${resource}, ${action}):`, result)
      return result
    },
    userPermissions: user.permissoes
  }
  
  return permissions
}


