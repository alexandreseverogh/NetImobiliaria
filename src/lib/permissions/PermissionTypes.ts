/**
 * ============================================================
 * PERMISSION TYPES - Tipos TypeScript do Sistema de Permissões
 * ============================================================
 * 
 * Tipos centralizados para garantir type-safety em toda aplicação
 * ============================================================
 */

/**
 * Níveis de permissão suportados (5 níveis granulares)
 * - CREATE: Pode criar novos registros
 * - READ: Pode visualizar/listar registros
 * - UPDATE: Pode editar registros existentes
 * - DELETE: Pode excluir registros
 * - EXECUTE: Pode executar ação (dashboards, relatórios)
 * - ADMIN: Controle total sobre o recurso
 */
export type PermissionLevel = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ADMIN' | 'WRITE'

/**
 * Actions do banco de dados (minúsculas - correspondem exatamente aos níveis)
 */
export type DatabasePermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin'

/**
 * Mapa de permissões do usuário
 * { 'imoveis': 'WRITE', 'clientes': 'READ', ... }
 */
export type UserPermissionsMap = Record<string, PermissionLevel>

/**
 * Configuração de rota do banco
 */
export interface RoutePermissionConfig {
  id: number
  route_pattern: string
  method: string
  feature_id: number
  feature_slug: string
  default_action: PermissionLevel
  requires_auth: boolean
  requires_2fa: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
}

/**
 * Dados do usuário com permissões
 */
export interface UserWithPermissions {
  id: string
  username: string
  email: string
  nome: string
  telefone?: string
  ativo: boolean
  ultimo_login?: Date
  role_id?: number
  role_name?: string
  role_description?: string
  role_level?: number
  requires_2fa?: boolean
  permissoes: UserPermissionsMap
}

/**
 * Resultado de verificação de permissão
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  feature?: string
  required_action?: PermissionLevel
}

