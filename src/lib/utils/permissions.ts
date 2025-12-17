/**
 * ============================================================
 * NOVO SISTEMA DE PERMISSÕES - 5 NÍVEIS GRANULARES
 * ============================================================
 * ELIMINOU: WRITE (confuso, mesclava create + update)
 * AGORA: CREATE, READ, UPDATE, DELETE, EXECUTE, ADMIN
 * ============================================================
 */

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ADMIN' | 'WRITE'

export interface Permission {
  resource: string
  action: PermissionAction
}

/**
 * Mapa dinâmico de permissões (100% baseado em slugs do banco)
 */
export type UserPermissions = Record<string, PermissionAction>

type NormalizedPermissionAction = Exclude<PermissionAction, 'WRITE'>

const permissionLevels: Record<NormalizedPermissionAction, number> = {
  READ: 1,
  EXECUTE: 2,
  CREATE: 3,
  UPDATE: 4,
  DELETE: 5,
  ADMIN: 6
}

function normalizeAction(action: PermissionAction): NormalizedPermissionAction {
  if (action === 'WRITE') {
    return 'UPDATE'
  }
  return action
}

export function hasPermission(
  userPermissions: UserPermissions | null | undefined,
  resource: string,
  action: PermissionAction
): boolean {
  if (!userPermissions) return false
  
  const userPermission = userPermissions[resource]
  
  if (!userPermission) return false
  
  const normalizedUserPermission = normalizeAction(userPermission)
  const normalizedAction = normalizeAction(action)
  
  return permissionLevels[normalizedUserPermission] >= permissionLevels[normalizedAction]
}

export function canRead(userPermissions: UserPermissions, resource: string): boolean {
  return hasPermission(userPermissions, resource, 'READ')
}

export function canCreate(userPermissions: UserPermissions, resource: string): boolean {
  return hasPermission(userPermissions, resource, 'CREATE')
}

export function canUpdate(userPermissions: UserPermissions, resource: string): boolean {
  return hasPermission(userPermissions, resource, 'UPDATE')
}

export function canDelete(userPermissions: UserPermissions, resource: string): boolean {
  return hasPermission(userPermissions, resource, 'DELETE')
}

export function canExecute(userPermissions: UserPermissions, resource: string): boolean {
  return hasPermission(userPermissions, resource, 'EXECUTE')
}

export function isAdmin(userPermissions: UserPermissions, resource: string): boolean {
  return hasPermission(userPermissions, resource, 'ADMIN')
}

export function requirePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: PermissionAction
): void {
  if (!hasPermission(userPermissions, resource, action)) {
    throw new Error(`Permissão negada: ${action} em ${resource}`)
  }
}
