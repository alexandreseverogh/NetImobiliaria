import pool from './connection'
import type { PermissionAction } from '@/lib/utils/permissions'

export interface UserPermission {
  resource: string
  action: string
  permission: PermissionAction
}

export interface UserPermissionsMap {
  [resource: string]: PermissionAction
}

/**
 * Busca todas as permissões de um usuário baseado no seu role
 * @param userId ID do usuário
 * @returns Mapa de permissões por recurso
 */
export async function getUserPermissions(userId: string): Promise<UserPermissionsMap> {
  try {
    // 🔐 REGRA ESPECIAL: SUPER ADMIN TEM ACESSO ADMIN A TUDO!
    const userRoleQuery = `
      SELECT ur.name 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
      LIMIT 1
    `
    const roleResult = await pool.query(userRoleQuery, [userId])
    
    if (roleResult.rows.length > 0 && roleResult.rows[0].name === 'Super Admin') {
      console.log('👑 Super Admin detectado - Retornando ADMIN em TODAS as funcionalidades')
      
      // Buscar TODAS as funcionalidades ativas e retornar ADMIN para cada uma
      const allFeaturesQuery = `SELECT slug FROM system_features WHERE is_active = true`
      const featuresResult = await pool.query(allFeaturesQuery)
      
      const permissionsMap: UserPermissionsMap = {}
      featuresResult.rows.forEach((row: any) => {
        permissionsMap[row.slug] = 'ADMIN'
      })
      
      console.log('👑 Super Admin - Total de funcionalidades com ADMIN:', Object.keys(permissionsMap).length)
      return permissionsMap
    }
    
    const query = `
      SELECT 
        sf.slug as resource_slug,
        p.action
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.id = $1 
        AND u.ativo = true
        AND ura.role_id IN (
          SELECT id FROM user_roles WHERE is_active = true
        )
        AND sf.is_active = true
      ORDER BY sf.slug, p.action
    `
    
    console.log('🔍 getUserPermissions - Buscando permissões para userId:', userId)
    
    const result = await pool.query(query, [userId])
    
    console.log('🔍 getUserPermissions - Registros encontrados:', result.rows.length)
    
    // Processar resultados para criar mapa de permissões
    const permissionsMap: UserPermissionsMap = {}
    
    // Agrupar ações por recurso primeiro
    const resourceActions: { [key: string]: string[] } = {}
    
    result.rows.forEach((row: any) => {
      const { resource_slug, action } = row
      
      console.log('  📋 Permissão encontrada:', { resource_slug, action })
      
      if (!resourceActions[resource_slug]) {
        resourceActions[resource_slug] = []
      }
      resourceActions[resource_slug].push(action.toLowerCase())
    })
    
    // Determinar nível MAIS ALTO de permissão baseado no conjunto de ações
    Object.keys(resourceActions).forEach(resource => {
      const actions = resourceActions[resource]
      
      console.log(`  🔍 Analisando ações para ${resource}:`, actions)
      
      // Mapear para o nível MAIS ALTO que o usuário possui
      // Ordem hierárquica: ADMIN > DELETE > UPDATE > CREATE > EXECUTE > READ
      
      if (actions.includes('admin')) {
        permissionsMap[resource] = 'ADMIN'
        console.log(`  ✅ ${resource}: ADMIN (controle total)`)
      } else if (actions.includes('delete')) {
        permissionsMap[resource] = 'DELETE'
        console.log(`  ✅ ${resource}: DELETE (pode excluir)`)
      } else if (actions.includes('update') || actions.includes('write')) {
        permissionsMap[resource] = 'UPDATE'
        console.log(`  ✅ ${resource}: UPDATE (pode editar)`)
      } else if (actions.includes('create')) {
        permissionsMap[resource] = 'CREATE'
        console.log(`  ✅ ${resource}: CREATE (pode criar)`)
      } else if (actions.includes('execute')) {
        permissionsMap[resource] = 'EXECUTE'
        console.log(`  ✅ ${resource}: EXECUTE (pode executar)`)
      } else if (actions.includes('read') || actions.includes('list')) {
        permissionsMap[resource] = 'READ'
        console.log(`  ✅ ${resource}: READ (apenas visualizar)`)
      }
      
      console.log(`  📊 ${resource}: Ações = [${actions.join(', ')}] → Nível = ${permissionsMap[resource]}`)
    })
    
    console.log('✅ getUserPermissions - Mapa de permissões final:', permissionsMap)
    
    return permissionsMap
  } catch (error) {
    console.error('❌ ERRO ao buscar permissões do usuário:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

/**
 * Verifica se um usuário tem uma permissão específica
 * @param userId ID do usuário
 * @param resource Recurso (ex: 'imoveis', 'usuarios')
 * @param action Ação (ex: 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'ADMIN')
 * @returns true se o usuário tem a permissão
 */
export async function userHasPermission(
  userId: string, 
  resource: string, 
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ADMIN' | 'WRITE' // WRITE temporário
): Promise<boolean> {
  try {
    // ⚠️ RETROCOMPATIBILIDADE TEMPORÁRIA: WRITE → UPDATE
    let mappedAction = action
    if (action === 'WRITE') {
      console.warn(`⚠️ WRITE está DEPRECATED! Mapeando para UPDATE. Recurso: ${resource}`)
      mappedAction = 'UPDATE'
    }
    
    const userPermissions = await getUserPermissions(userId)
    const userPermission = userPermissions[resource]
    
    if (!userPermission) {
      return false
    }
    
    return getPermissionLevel(userPermission) >= getPermissionLevel(mappedAction as any)
  } catch (error) {
    console.error('Erro ao verificar permissão do usuário:', error)
    return false
  }
}

/**
 * Busca informações completas do usuário com permissões
 * @param userId ID do usuário
 * @returns Dados do usuário com permissões e role
 */
export async function getUserWithPermissions(userId: string) {
  try {
    // Buscar dados básicos do usuário
    const userQuery = `
      SELECT 
        u.id, u.username, u.email, u.nome, u.telefone, u.ativo, 
        u.ultimo_login, u.created_at, u.updated_at
      FROM users u
      WHERE u.id = $1 AND u.ativo = true
    `
    
    const userResult = await pool.query(userQuery, [userId])
    
    if (userResult.rows.length === 0) {
      return null
    }
    
    let user = userResult.rows[0]
    
    // Buscar role do usuário (opcional - pode não ter)
    const roleQuery = `
      SELECT 
        ur.id as role_id, ur.name as role_name, ur.description as role_description, 
        ur.level as role_level, ur.requires_2fa
      FROM user_role_assignments ura
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
      LIMIT 1
    `
    
    const roleResult = await pool.query(roleQuery, [userId])
    
    if (roleResult.rows.length > 0) {
      // Adicionar dados do role ao user
      user = { ...user, ...roleResult.rows[0] }
    } else {
      // Usuário sem role - definir valores padrão
      user.role_id = null
      user.role_name = 'Usuário'
      user.role_description = 'Usuário sem perfil definido'
      user.role_level = 1
      user.requires_2fa = false
    }
    
    // Buscar permissões do usuário
    const permissions = await getUserPermissions(userId)
    
    return {
      ...user,
      permissoes: permissions
    }
  } catch (error) {
    console.error('❌ ERRO ao buscar usuário com permissões:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

/**
 * @deprecated ESTA FUNÇÃO NÃO É MAIS NECESSÁRIA!
 * MOTIVO: Agora usamos sf.slug diretamente do banco de dados
 * 
 * Mapeia nomes das funcionalidades para recursos esperados pelo frontend
 * NOTA: Esta função foi mantida apenas para referência histórica
 */
function mapFeatureToResource(funcionalidade: string): string {
  const featureMapping: { [key: string]: string } = {
    // Sistema/Admin
    'Categorias de Funcionalidades': 'system-features',
    'Funcionalidades do Sistema': 'system-features',
    'funcionalidades do sistema': 'system-features', // nome exato do banco
    'Gestão de Perfis': 'roles',
    'Gestão de permissões': 'permissions',
    'Hierarquia de Perfis': 'hierarchy',
    'Usuários': 'usuarios',
    'Sessões': 'sessions',
    'Monitoramento e auditoria de tentativas de login/logout com status 2FA': 'login-logs',
    'Expurgo de histórico de login e logout': 'login-logs',
    'Análise de Logs': 'analytics-logs',
    'Relatórios de Logs': 'reports-logs',
    'Configurações de Logs': 'config-logs',
    'Expurgo de Logs': 'purge-logs',
    'Logs de Auditoria': 'audit-logs',
    'Auditoria': 'audit-logs',
    'Auditoria de Logs do Sistema': 'audit-logs', // nome exato do banco
    
    // Imóveis
    'Imóveis': 'imoveis',
    'Tipos de Imóveis': 'tipos-imoveis',
    'Finalidades de Imóveis': 'finalidades',
    'Status de Imóveis': 'status-imovel',
    'Mudança de Status': 'mudancas-status',
    
    // Amenidades e Proximidades
    'Amenidades': 'amenidades',
    'Categorias de Amenidades': 'categorias-amenidades',
    'Proximidades': 'proximidades',
    'Categorias de Proximidades': 'categorias-proximidades',
    
    // Documentos
    'Tipos de Documentos': 'tipos-documentos',
    
    // Clientes e Proprietários
    'Clientes': 'clientes',
    'Proprietários': 'proprietarios',
    
    // Dashboard e Relatórios
    'Dashboard': 'dashboards',
    'Relatórios': 'relatorios'
  }
  
  return featureMapping[funcionalidade] || funcionalidade.toLowerCase().replace(/\s+/g, '-')
}

/**
 * @deprecated Esta função não é mais necessária!
 * MOTIVO: Agora mapeamos diretamente na função getUserPermissions usando lógica granular
 */
function mapActionToPermissionLevel(action: string): string {
  console.warn('⚠️ mapActionToPermissionLevel está DEPRECATED! Use a lógica granular em getUserPermissions')
  return 'READ'
}

/**
 * Converte nível de permissão para número para comparação
 * Hierarquia: ADMIN(6) > DELETE(5) > UPDATE(4) > CREATE(3) > EXECUTE(2) > READ(1)
 * @param permission Nível de permissão
 * @returns Número representando o nível
 */
function getPermissionLevel(permission: PermissionAction): number {
  const normalized = permission === 'WRITE' ? 'UPDATE' : permission
  const levels: Record<'READ' | 'EXECUTE' | 'CREATE' | 'UPDATE' | 'DELETE' | 'ADMIN', number> = {
    READ: 1,
    EXECUTE: 2,
    CREATE: 3,
    UPDATE: 4,
    DELETE: 5,
    ADMIN: 6
  }
  
  return levels[normalized]
}

/**
 * Verifica se um usuário tem permissão para um recurso específico (versão simplificada)
 * @param userPermissions Mapa de permissões do usuário
 * @param resource Recurso
 * @param action Ação
 * @returns true se tem permissão
 */
export function hasPermission(
  userPermissions: UserPermissionsMap,
  resource: string,
  action: PermissionAction
): boolean {
  const userPermission = userPermissions[resource]
  
  if (!userPermission) {
    return false
  }
  
  return getPermissionLevel(userPermission) >= getPermissionLevel(action)
}
