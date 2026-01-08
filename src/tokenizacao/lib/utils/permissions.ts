/* eslint-disable */
export interface Permission {
  resource: string
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
}

export interface UserPermissions {
  imoveis: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  proximidades: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  amenidades: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'categorias-amenidades': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'categorias-proximidades': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'tipos-imoveis': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'tipos-documentos': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  status: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  finalidades: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'status-imovel': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  clientes: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  proprietarios: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  usuarios: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  relatorios: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  sistema: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
}

export function hasPermission(
  userPermissions: UserPermissions,
  resource: keyof UserPermissions,
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
): boolean {
  const userPermission = userPermissions[resource]
  
  if (!userPermission) return false
  
  const permissionLevels = {
    'READ': 1,
    'WRITE': 2,
    'DELETE': 3,
    'ADMIN': 4
  }
  
  return permissionLevels[userPermission] >= permissionLevels[action]
}

export function canRead(userPermissions: UserPermissions, resource: keyof UserPermissions): boolean {
  return hasPermission(userPermissions, resource, 'READ')
}

export function canWrite(userPermissions: UserPermissions, resource: keyof UserPermissions): boolean {
  return hasPermission(userPermissions, resource, 'WRITE')
}

export function canDelete(userPermissions: UserPermissions, resource: keyof UserPermissions): boolean {
  return hasPermission(userPermissions, resource, 'DELETE')
}

export function isAdmin(userPermissions: UserPermissions, resource: keyof UserPermissions): boolean {
  return hasPermission(userPermissions, resource, 'ADMIN')
}

export function requirePermission(
  userPermissions: UserPermissions,
  resource: keyof UserPermissions,
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
): void {
  if (!hasPermission(userPermissions, resource, action)) {
    throw new Error(`PermissÃ£o negada: ${action} em ${resource}`)
  }
}

