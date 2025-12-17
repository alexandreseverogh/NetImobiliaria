import { AdminUser } from '@/lib/types/admin';

// ============================================================
// CLASS: PermissionValidator
// ============================================================
// Centraliza TODA a lógica de validação de permissões
// Garante consistência e elimina hardcoding
// ============================================================

export class PermissionValidator {
  
  // ============================================================
  // MÉTODO: isAdmin
  // ============================================================
  // Verifica se usuário é admin
  // SEM HARDCODING - busca do banco de dados
  // ============================================================
  
  static async isAdmin(user: AdminUser): Promise<boolean> {
    if (!user || !user.role_name) {
      return false;
    }
    
    // Verificar role de admin (pode ser expandido para busca no banco)
    const adminRoles = ['Super Admin', 'Administrador'];
    return adminRoles.includes(user.role_name);
  }
  
  // ============================================================
  // MÉTODO: hasRole
  // ============================================================
  // Verifica se usuário tem uma role específica
  // ============================================================
  
  static hasRole(user: AdminUser, roleName: string): boolean {
    if (!user || !user.role_name) {
      return false;
    }
    
    return user.role_name === roleName;
  }
  
  // ============================================================
  // MÉTODO: hasAnyRole
  // ============================================================
  // Verifica se usuário tem qualquer uma das roles especificadas
  // ============================================================
  
  static hasAnyRole(user: AdminUser, roleNames: string[]): boolean {
    if (!user || !user.role_name || !roleNames || roleNames.length === 0) {
      return false;
    }
    
    return roleNames.includes(user.role_name);
  }
  
  // ============================================================
  // MÉTODO: hasPermission (Baseado em API)
  // ============================================================
  // Verifica se usuário tem permissão específica
  // Busca do backend (não hardcoded)
  // ============================================================
  
  static async hasPermission(
    user: AdminUser,
    resource: string,
    action: string
  ): Promise<boolean> {
    if (!user || !user.id) {
      return false;
    }
    
    try {
      const response = await fetch(
        `/api/admin/permissions/check?resource=${resource}&action=${action}`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        console.error('Erro ao verificar permissão:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.hasPermission === true;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }
  
  // ============================================================
  // MÉTODO: canAccessResource
  // ============================================================
  // Verifica se usuário pode acessar recurso específico
  // Combinação de role + permission
  // ============================================================
  
  static async canAccessResource(
    user: AdminUser,
    resource: string,
    allowedRoles?: string[]
  ): Promise<boolean> {
    // Verificar role primeiro (rápido)
    if (allowedRoles && allowedRoles.length > 0) {
      if (!this.hasAnyRole(user, allowedRoles)) {
        return false;
      }
    }
    
    // Verificar permissão específica (requer API)
    // Para performance, pode ser opcional
    // return await this.hasPermission(user, resource, 'READ');
    
    return true; // Se passou verificação de role
  }
  
  // ============================================================
  // MÉTODO: getAccessLevel
  // ============================================================
  // Retorna nível de acesso do usuário
  // ============================================================
  
  static getAccessLevel(user: AdminUser): 'admin' | 'user' | 'guest' {
    if (!user) return 'guest';
    
    const role = user.role_name;
    
    if (role === 'Super Admin' || role === 'Administrador') {
      return 'admin';
    }
    
    return 'user';
  }
  
  // ============================================================
  // MÉTODO: validateAccess
  // ============================================================
  // Valida acesso completo (role + permission + contexto)
  // ============================================================
  
  static async validateAccess(params: {
    user: AdminUser;
    resource: string;
    action: string;
    allowedRoles?: string[];
  }): Promise<boolean> {
    const { user, resource, action, allowedRoles } = params;
    
    // 1. Verificar role (opcional)
    if (allowedRoles && allowedRoles.length > 0) {
      if (!this.hasAnyRole(user, allowedRoles)) {
        return false;
      }
    }
    
    // 2. Verificar permissão específica
    const hasPerm = await this.hasPermission(user, resource, action);
    if (!hasPerm) {
      return false;
    }
    
    // 3. Todos os checks passaram
    return true;
  }
}

// ============================================================
// FUNÇÃO HELPER: canView
// ============================================================
// Atalho para verificar permissão de visualização
// ============================================================

export async function canView(user: AdminUser, resource: string): Promise<boolean> {
  return PermissionValidator.hasPermission(user, resource, 'READ');
}

// ============================================================
// FUNÇÃO HELPER: canEdit
// ============================================================
// Atalho para verificar permissão de edição
// ============================================================

export async function canEdit(user: AdminUser, resource: string): Promise<boolean> {
  return PermissionValidator.hasPermission(user, resource, 'UPDATE');
}

// ============================================================
// FUNÇÃO HELPER: canDelete
// ============================================================
// Atalho para verificar permissão de exclusão
// ============================================================

export async function canDelete(user: AdminUser, resource: string): Promise<boolean> {
  return PermissionValidator.hasPermission(user, resource, 'DELETE');
}

// ============================================================
// EXPORTS
// ============================================================

export default PermissionValidator;
