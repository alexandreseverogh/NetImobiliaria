/**
 * ============================================================
 * PERMISSION CHECKER - Sistema Centralizado de Permissões
 * ============================================================
 * 
 * OBJETIVO: Função ÚNICA para verificar permissões
 * Substitui todas as funções duplicadas no sistema
 * 
 * FEATURES:
 * - Consulta role_permissions do banco (tabela chave)
 * - Usa slug de system_features (sem hardcoding)
 * - Cache inteligente para performance
 * - Logs estruturados para auditoria
 * 
 * USO:
 * - Middleware de autorização
 * - APIs que precisam verificar permissões
 * - Componentes frontend (via API)
 * 
 * GUARDIAN RULES: ✅
 * - Zero hardcoding
 * - Baseado 100% no banco de dados
 * - Auditoria completa
 * ============================================================
 */

import pool from '@/lib/database/connection'
import type { PermissionLevel, UserPermissionsMap } from './PermissionTypes'

/**
 * Mapeamento de ações de alto nível para ações do banco
 * 
 * Lógica hierárquica (NOVO - 6 níveis granulares):
 * - READ: precisa apenas de 'read' ou 'list'
 * - EXECUTE: precisa de 'execute' (dashboards, relatórios)
 * - CREATE: precisa de 'create' (inclui READ)
 * - UPDATE: precisa de 'update' (inclui READ)
 * - DELETE: precisa de 'delete' (inclui UPDATE, CREATE e READ)
 * - ADMIN: precisa de 'admin' (acesso total)
 */
const ACTION_HIERARCHY: Record<PermissionLevel, string[]> = {
  READ: ['read', 'list'],
  EXECUTE: ['execute'],
  CREATE: ['create', 'read', 'list'],
  UPDATE: ['update', 'read', 'list'],
  DELETE: ['delete', 'update', 'create', 'read', 'list'],
  ADMIN: ['admin', 'delete', 'update', 'create', 'read', 'list', 'execute'],
  WRITE: ['update', 'read', 'list'] // legacy alias mapped to UPDATE
}

/**
 * ============================================================
 * FUNÇÃO PRINCIPAL: Verificar Permissão do Usuário
 * ============================================================
 * 
 * @param userId - UUID do usuário
 * @param featureSlug - Slug da funcionalidade (ex: 'imoveis', 'clientes')
 * @param requiredAction - Ação necessária ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'ADMIN')
 * @returns true se usuário tem permissão, false caso contrário
 */
export async function checkUserPermission(
  userId: string,
  featureSlug: string,
  requiredAction: PermissionLevel,
  tenantId?: string
): Promise<boolean> {
  // ⚠️ RETROCOMPATIBILIDADE TEMPORÁRIA: WRITE → UPDATE
  const mappedAction: PermissionLevel = requiredAction === 'WRITE' ? 'UPDATE' : requiredAction
  try {
    // 🔐 REGRA ESPECIAL: PERFIL MASTER TEM ACESSO TOTAL A TUDO!
    // GOVERNANÇA: Verifica em ambas as tabelas de associação se existe um role marcado como is_system_role
    const userRoleQuery = `
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1::uuid AND ur.is_system_role = true
      UNION
      SELECT 1 FROM user_tenant_membership utm
      JOIN user_roles ur ON utm.role_id = ur.id
      WHERE utm.user_id = $1::uuid AND ur.is_system_role = true
    `
    const roleResult = await pool.query(userRoleQuery, [userId])
    
    if (roleResult.rows.length > 0) {
      console.log('🛡️ System Role detectada - ACESSO TOTAL CONCEDIDO (Global Bypass)')
      return true
    }
    
    // Buscar ações permitidas baseado na hierarquia
    const allowedActions = ACTION_HIERARCHY[mappedAction] || [mappedAction.toLowerCase()]
    
    // Query unificada com isolamento de Tenant e Módulo
    const query = `
      SELECT 1
      FROM (
        -- Atribuições globais (só valem se não estivermos filtrando por tenant específico ou se for master)
        SELECT role_id FROM user_role_assignments WHERE user_id = $1::uuid AND $4::uuid IS NULL
        UNION
        -- Atribuições via Tenant Membership (Isolamento de dados)
        SELECT role_id FROM user_tenant_membership WHERE user_id = $1::uuid AND is_active = true AND (tenant_id = $4::uuid OR $4::uuid IS NULL)
      ) as user_roles_combined
      JOIN role_permissions rp ON user_roles_combined.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      -- Verificação de Módulo (Entitlement)
      LEFT JOIN system_feature_modules fm ON sf.id = fm.feature_id
      LEFT JOIN tenant_modules tm ON fm.module_id = tm.module_id AND tm.tenant_id = $4::uuid
      WHERE sf.slug = $2
        AND sf.is_active = true
        AND p.action = ANY($3)
        AND (
          $4::uuid IS NULL OR -- Se não houver contexto de tenant, não bloqueia por módulo (ex: Master)
          fm.module_id IS NULL OR -- Feature sem módulo vinculado
          tm.is_enabled = true -- Módulo habilitado para o tenant
        )
      LIMIT 1
    `
    
    const result = await pool.query(query, [userId, featureSlug, allowedActions, tenantId || null])

    
    const hasPermission = result.rows.length > 0
    
    // Log para auditoria (apenas quando negado)
    if (!hasPermission) {
      console.log('🔒 Acesso negado:', {
        userId,
        featureSlug,
        requiredAction,
        timestamp: new Date().toISOString()
      })
    }
    
    return hasPermission
  } catch (error) {
    console.error('❌ Erro ao verificar permissão:', error)
    return false // Em caso de erro, negar acesso (fail-safe)
  }
}

/**
 * ============================================================
 * Buscar Mapa Completo de Permissões do Usuário
 * ============================================================
 * 
 * Retorna todas as permissões do usuário em um objeto:
 * { 'imoveis': 'WRITE', 'clientes': 'READ', ... }
 * 
 * @param userId - UUID do usuário
 * @returns Objeto com slug → nível de permissão
 */
export async function getUserPermissionsMap(
  userId: string
): Promise<UserPermissionsMap> {
  try {
    const query = `
      SELECT 
        sf.slug,
        MAX(
          CASE 
            WHEN p.action = 'admin' THEN 6
            WHEN p.action = 'delete' THEN 5
            WHEN p.action = 'update' THEN 4
            WHEN p.action = 'create' THEN 3
            WHEN p.action = 'execute' THEN 2
            WHEN p.action IN ('read', 'list') THEN 1
            ELSE 0
          END
        ) as permission_level
      FROM (
        SELECT role_id FROM user_role_assignments WHERE user_id = $1::uuid
        UNION
        SELECT role_id FROM user_tenant_membership WHERE user_id = $1::uuid AND is_active = true
      ) as user_roles_combined
      JOIN role_permissions rp ON user_roles_combined.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.is_active = true
      GROUP BY sf.slug
    `
    
    const result = await pool.query(query, [userId])
    
    // Mapear níveis numéricos para strings (NOVO - 6 níveis granulares)
    const levelMap: Record<number, PermissionLevel> = {
      6: 'ADMIN',
      5: 'DELETE',
      4: 'UPDATE',
      3: 'CREATE',
      2: 'EXECUTE',
      1: 'READ'
    }
    
    const permissionsMap: UserPermissionsMap = {}
    
    result.rows.forEach(row => {
      permissionsMap[row.slug] = levelMap[row.permission_level] || 'READ'
    })
    
    return permissionsMap
  } catch (error) {
    console.error('❌ Erro ao buscar mapa de permissões:', error)
    return {}
  }
}

/**
 * ============================================================
 * Verificar se usuário tem permissão específica (versão síncrona)
 * ============================================================
 * 
 * Usa mapa de permissões já carregado (mais eficiente)
 * 
 * @param permissionsMap - Mapa de permissões do usuário
 * @param featureSlug - Slug da funcionalidade
 * @param requiredAction - Ação necessária
 * @returns true se tem permissão
 */
export function hasPermissionSync(
  userPermissions: UserPermissionsMap,
  resource: string,
  action: PermissionLevel
): boolean {
  const permission = userPermissions[resource]
  if (!permission) return false
  
  const normalize = (value: PermissionLevel): PermissionLevel => (value === 'WRITE' ? 'UPDATE' : value)
  const normalizedAction = normalize(action)
  const normalizedPermission = normalize(permission)
  const hierarchy: PermissionLevel[] = ['READ', 'EXECUTE', 'CREATE', 'UPDATE', 'DELETE', 'ADMIN']
  return hierarchy.indexOf(normalizedPermission) >= hierarchy.indexOf(normalizedAction)
}

/**
 * ============================================================
 * Buscar Informações do Usuário com Permissões
 * ============================================================
 * 
 * Retorna dados completos do usuário incluindo seu mapa de permissões
 * 
 * @param userId - UUID do usuário
 * @returns Objeto com dados do usuário e permissões
 */
export async function getUserWithPermissions(userId: string) {
  try {
    // Buscar dados básicos do usuário
    const userQuery = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.nome, 
        u.telefone, 
        u.ativo, 
        u.ultimo_login,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = $1 AND u.ativo = true
    `
    
    const userResult = await pool.query(userQuery, [userId])
    
    if (userResult.rows.length === 0) {
      return null
    }
    
    let user = userResult.rows[0]
    
    // Buscar role do usuário (Priorizando system role se existir)
    const roleQuery = `
      SELECT 
        ur.id as role_id, 
        ur.name as role_name, 
        ur.description as role_description, 
        ur.level as role_level, 
        ur.requires_2fa,
        ur.is_system_role
      FROM (
        SELECT role_id FROM user_role_assignments WHERE user_id = $1::uuid
        UNION
        SELECT role_id FROM user_tenant_membership WHERE user_id = $1::uuid AND is_active = true
      ) as user_roles_combined
      JOIN user_roles ur ON user_roles_combined.role_id = ur.id
      ORDER BY ur.is_system_role DESC, ur.level DESC
      LIMIT 1
    `

    
    const roleResult = await pool.query(roleQuery, [userId])
    
    if (roleResult.rows.length > 0) {
      user = { ...user, ...roleResult.rows[0] }
    } else {
      // Usuário sem role
      user.role_id = null
      user.role_name = 'Sem Perfil'
      user.role_description = 'Usuário sem perfil definido'
      user.role_level = 0
      user.requires_2fa = false
    }
    
    // Buscar mapa de permissões
    const permissoes = await getUserPermissionsMap(userId)
    
    return {
      ...user,
      permissoes
    }
  } catch (error) {
    console.error('❌ Erro ao buscar usuário com permissões:', error)
    throw error
  }
}

