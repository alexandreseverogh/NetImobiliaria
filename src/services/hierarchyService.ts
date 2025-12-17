/**
 * Serviço para validação de hierarquia de perfis
 */

export interface RoleHierarchy {
  id: number
  name: string
  level: number
  canManage: number[] // IDs dos roles que este role pode gerenciar
  managedBy: number[] // IDs dos roles que podem gerenciar este role
}

// Definição da hierarquia de perfis
export const ROLE_HIERARCHY: Record<string, RoleHierarchy> = {
  'Super Admin': {
    id: 1,
    name: 'Super Admin',
    level: 100,
    canManage: [2, 3, 4, 5, 6, 7, 8, 9], // Pode gerenciar todos os outros
    managedBy: [] // Ninguém pode gerenciar o Super Admin
  },
  'Administrador': {
    id: 2,
    name: 'Administrador',
    level: 80,
    canManage: [3, 4, 5, 6, 7, 8, 9], // Pode gerenciar roles de nível inferior
    managedBy: [1] // Apenas Super Admin pode gerenciar
  },
  'Corretor': {
    id: 3,
    name: 'Corretor',
    level: 60,
    canManage: [4, 5, 6, 7, 8, 9], // Pode gerenciar roles básicos
    managedBy: [1, 2] // Super Admin e Administrador podem gerenciar
  },
  'Usuário': {
    id: 9,
    name: 'Usuário',
    level: 20,
    canManage: [], // Não pode gerenciar nenhum role
    managedBy: [1, 2, 3] // Todos os roles superiores podem gerenciar
  }
}

/**
 * Verifica se um role pode gerenciar outro role
 */
export function canManageRole(managerRoleName: string, targetRoleName: string): boolean {
  const manager = ROLE_HIERARCHY[managerRoleName]
  const target = ROLE_HIERARCHY[targetRoleName]
  
  if (!manager || !target) {
    return false
  }
  
  return manager.canManage.includes(target.id) || manager.level > target.level
}

/**
 * Verifica se um role pode criar outro role com determinado nível
 */
export function canCreateRoleWithLevel(creatorRoleName: string, newRoleLevel: number): boolean {
  const creator = ROLE_HIERARCHY[creatorRoleName]
  
  if (!creator) {
    return false
  }
  
  // O criador só pode criar roles com nível menor que o seu
  return newRoleLevel < creator.level
}

/**
 * Verifica se um role pode editar outro role
 */
export function canEditRole(editorRoleName: string, targetRoleName: string): boolean {
  const editor = ROLE_HIERARCHY[editorRoleName]
  const target = ROLE_HIERARCHY[targetRoleName]
  
  if (!editor || !target) {
    return false
  }
  
  // Não pode editar roles de nível igual ou superior
  return editor.level > target.level
}

/**
 * Verifica se um role pode excluir outro role
 */
export function canDeleteRole(deleterRoleName: string, targetRoleName: string): boolean {
  const deleter = ROLE_HIERARCHY[deleterRoleName]
  const target = ROLE_HIERARCHY[targetRoleName]
  
  if (!deleter || !target) {
    return false
  }
  
  // Não pode excluir roles de nível igual ou superior
  // Super Admin nunca pode ser excluído
  return deleter.level > target.level && target.name !== 'Super Admin'
}

/**
 * Verifica se um role pode gerenciar permissões de outro role
 */
export function canManageRolePermissions(managerRoleName: string, targetRoleName: string): boolean {
  const manager = ROLE_HIERARCHY[managerRoleName]
  const target = ROLE_HIERARCHY[targetRoleName]
  
  if (!manager || !target) {
    return false
  }
  
  // Pode gerenciar permissões se pode gerenciar o role
  return canManageRole(managerRoleName, targetRoleName)
}

/**
 * Obtém todos os roles que um role pode gerenciar
 */
export function getManageableRoles(roleName: string): string[] {
  const role = ROLE_HIERARCHY[roleName]
  
  if (!role) {
    return []
  }
  
  return role.canManage.map(id => {
    const roleName = Object.keys(ROLE_HIERARCHY).find(name => 
      ROLE_HIERARCHY[name].id === id
    )
    return roleName
  }).filter(Boolean) as string[]
}

/**
 * Obtém todos os roles que podem gerenciar um determinado role
 */
export function getRolesThatCanManage(roleName: string): string[] {
  const role = ROLE_HIERARCHY[roleName]
  
  if (!role) {
    return []
  }
  
  return role.managedBy.map(id => {
    const roleName = Object.keys(ROLE_HIERARCHY).find(name => 
      ROLE_HIERARCHY[name].id === id
    )
    return roleName
  }).filter(Boolean) as string[]
}

/**
 * Valida se uma operação é permitida baseada na hierarquia
 */
export function validateHierarchyOperation(
  operation: 'create' | 'read' | 'update' | 'delete' | 'manage_permissions',
  operatorRoleName: string,
  targetRoleName: string,
  newRoleLevel?: number
): { allowed: boolean; reason?: string } {
  const operator = ROLE_HIERARCHY[operatorRoleName]
  const target = ROLE_HIERARCHY[targetRoleName]
  
  if (!operator) {
    return { allowed: false, reason: 'Role do operador não encontrado' }
  }
  
  switch (operation) {
    case 'create':
      if (newRoleLevel === undefined) {
        return { allowed: false, reason: 'Nível do novo role não especificado' }
      }
      if (!canCreateRoleWithLevel(operatorRoleName, newRoleLevel)) {
        return { 
          allowed: false, 
          reason: `${operatorRoleName} não pode criar roles com nível ${newRoleLevel} (máximo permitido: ${operator.level - 1})` 
        }
      }
      break
      
    case 'read':
      // Todos podem ler informações de roles
      return { allowed: true }
      
    case 'update':
      if (!target) {
        return { allowed: false, reason: 'Role alvo não encontrado' }
      }
      if (!canEditRole(operatorRoleName, targetRoleName)) {
        return { 
          allowed: false, 
          reason: `${operatorRoleName} não pode editar ${targetRoleName} (nível ${target.level} >= ${operator.level})` 
        }
      }
      break
      
    case 'delete':
      if (!target) {
        return { allowed: false, reason: 'Role alvo não encontrado' }
      }
      if (!canDeleteRole(operatorRoleName, targetRoleName)) {
        return { 
          allowed: false, 
          reason: `${operatorRoleName} não pode excluir ${targetRoleName} (nível ${target.level} >= ${operator.level})` 
        }
      }
      break
      
    case 'manage_permissions':
      if (!target) {
        return { allowed: false, reason: 'Role alvo não encontrado' }
      }
      if (!canManageRolePermissions(operatorRoleName, targetRoleName)) {
        return { 
          allowed: false, 
          reason: `${operatorRoleName} não pode gerenciar permissões de ${targetRoleName}` 
        }
      }
      break
  }
  
  return { allowed: true }
}

/**
 * Obtém informações da hierarquia para exibição
 */
export function getHierarchyInfo(): {
  levels: Array<{ name: string; level: number; canManage: string[] }>
  matrix: Record<string, Record<string, boolean>>
} {
  const levels = Object.values(ROLE_HIERARCHY).map(role => ({
    name: role.name,
    level: role.level,
    canManage: getManageableRoles(role.name)
  })).sort((a, b) => b.level - a.level)
  
  const matrix: Record<string, Record<string, boolean>> = {}
  Object.keys(ROLE_HIERARCHY).forEach(manager => {
    matrix[manager] = {}
    Object.keys(ROLE_HIERARCHY).forEach(target => {
      matrix[manager][target] = canManageRole(manager, target)
    })
  })
  
  return { levels, matrix }
}


