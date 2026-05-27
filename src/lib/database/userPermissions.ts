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

export interface AuditConfigMap {
  [tableName: string]: {
    enrichment_type: 'NONE' | 'UNIVERSAL' | 'PREMIUM';
    premium_component_id?: string;
  }
}

/**
 * Busca todas as permissões de um usuário baseado no seu role
 * @param userId ID do usuário
 * @returns Mapa de permissões por recurso
 */
export async function getUserPermissions(userId: string, tenantId?: string): Promise<UserPermissionsMap> {
  try {
    // 🛡️ REGRA DE OURO: SYSTEM ROLES (MASTER) TÊM ACESSO GLOBAL
    const userRoleQuery = `
      SELECT ur.is_system_role, ur.level
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1::uuid AND ur.is_system_role = true
      LIMIT 1
    `
    const roleResult = await pool.query(userRoleQuery, [userId])
    
    if (roleResult.rows.length > 0) {
      console.log('🛡️ Master Platform Admin detectado - Concedendo permissões globais via Metadata')
      
      const allFeaturesQuery = `SELECT slug FROM system_features WHERE is_active = true`
      const featuresResult = await pool.query(allFeaturesQuery)
      
      const permissionsMap: UserPermissionsMap = {}
      featuresResult.rows.forEach((row: any) => {
        permissionsMap[row.slug] = 'ADMIN'
      })
      
      return permissionsMap
    }
    
    // ─── REGRA 2: TENANT ADMIN — Bypassa role_permissions, mas respeita tenant_feature_overrides
    // Se o role do usuário contém 'admin' no nome, concede ADMIN em todas as features provisionadas
    const tenantAdminRoleQuery = `
      SELECT ur.name as role_name
      FROM user_tenant_membership utm
      JOIN user_roles ur ON utm.role_id = ur.id
      WHERE utm.user_id = $1::uuid AND utm.tenant_id = $2::uuid AND utm.is_active = true
      LIMIT 1
    `
    const tenantAdminResult = tenantId
      ? await pool.query(tenantAdminRoleQuery, [userId, tenantId])
      : { rows: [] }
    const tenantRoleName: string = tenantAdminResult.rows[0]?.role_name || ''

    if (tenantRoleName.toLowerCase().includes('admin')) {
      console.log(`🏢 Tenant Admin detectado (role: "${tenantRoleName}") — Concedendo ADMIN nas features provisionadas`)

      const provisionedQuery = `
        SELECT sf.slug
        FROM tenant_feature_overrides tfo
        JOIN system_features sf ON tfo.feature_id = sf.id
        WHERE tfo.tenant_id = $1::uuid AND tfo.is_active = true AND sf.is_active = true
      `
      const provisionedResult = await pool.query(provisionedQuery, [tenantId!])

      const permissionsMap: UserPermissionsMap = {}
      provisionedResult.rows.forEach((row: any) => {
        permissionsMap[row.slug] = 'ADMIN'
      })

      console.log('✅ [Tenant Admin] Permissões concedidas:', Object.keys(permissionsMap))
      return permissionsMap
    }

    // Se não for Super Admin nem Tenant Admin, buscar permissões específicas do role
    const query = `
      SELECT
        sf.slug as resource_slug,
        p.action
      FROM users u
      JOIN user_tenant_membership utm ON u.id = utm.user_id
      JOIN role_permissions rp ON utm.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features f ON p.feature_id = f.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.id = $1::uuid
        AND utm.tenant_id = $2::uuid
        AND (rp.tenant_id = $2::uuid OR rp.tenant_id IS NULL)
        AND u.ativo = true
        AND utm.is_active = true
        AND sf.is_active = true
        -- Soberania da Provisão Individual: Só libera se estiver marcado na Master
        AND EXISTS (
          SELECT 1 FROM tenant_feature_overrides tfo
          WHERE tfo.feature_id = sf.id AND tfo.tenant_id = $2::uuid AND tfo.is_active = true
        )
      ORDER BY sf.slug, p.action
    `
    
    console.log(`🔍 [getUserPermissions] Buscando permissões | User: ${userId} | Tenant: ${tenantId}`);
    
    const result = await pool.query(query, [userId, tenantId]);
    
    console.log(`🔍 [getUserPermissions] Registros encontrados para ${userId}: ${result.rows.length}`)
    
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
 * Busca as configurações de auditoria permitidas para o tenant (Soberania do Master)
 */
export async function getAuditConfigs(tenantId?: string): Promise<AuditConfigMap> {
  if (!tenantId) return {};
  
  try {
    const query = `
      SELECT 
        ac.table_name,
        ac.enrichment_type,
        ac.premium_component_id
      FROM system_audit_configs ac
      LEFT JOIN system_modules sm ON ac.module_id = sm.id
      WHERE ac.is_active = true
        AND (
          ac.module_id IS NULL -- Auditoria Global
          OR EXISTS (
            SELECT 1 FROM tenant_modules tm
            WHERE tm.module_id = ac.module_id AND tm.tenant_id = $1::uuid
          )
        )
    `;
    
    const result = await pool.query(query, [tenantId]);
    const configMap: AuditConfigMap = {};
    
    result.rows.forEach(row => {
      configMap[row.table_name] = {
        enrichment_type: row.enrichment_type as any,
        premium_component_id: row.premium_component_id
      };
    });
    
    return configMap;
  } catch (error) {
    console.error('❌ ERRO ao buscar configurações de auditoria:', error);
    return {};
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
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ADMIN' | 'WRITE', // WRITE temporário
  tenantId?: string
): Promise<boolean> {
  try {
    // ⚠️ RETROCOMPATIBILIDADE TEMPORÁRIA: WRITE → UPDATE
    let mappedAction = action
    if (action === 'WRITE') {
      console.warn(`⚠️ WRITE está DEPRECATED! Mapeando para UPDATE. Recurso: ${resource}`)
      mappedAction = 'UPDATE'
    }
    
    const userPermissions = await getUserPermissions(userId, tenantId)
    const userPermission = userPermissions[resource]
    
    console.log(`🛡️ [userHasPermission] Check | Resource: ${resource} | Action: ${action} | User: ${userId} | Tenant: ${tenantId} | Result: ${!!userPermission}`)
    
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
export async function getUserWithPermissions(userId: string, tenantId?: string) {
  try {
    // Buscar dados básicos do usuário
    const userQuery = `
      SELECT 
        u.id, u.username, u.email, u.nome, u.telefone, u.ativo, 
        u.ultimo_login, u.created_at, u.updated_at
      FROM users u
      WHERE u.id = $1::uuid AND u.ativo = true
    `
    
    const userResult = await pool.query(userQuery, [userId])
    
    if (userResult.rows.length === 0) {
      return null
    }
    
    let user = userResult.rows[0]
    
    // Buscar role do usuário no contexto do Tenant (Prioritário) + Detalhes do Tenant
    const roleQuery = `
      SELECT 
        ur.id as role_id, ur.name as role_name, ur.description as role_description, 
        ur.level as role_level, ur.requires_2fa, ur.is_system_role,
        t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug,
        t.logo as tenant_logo, t.logo_url as tenant_logo_url, t.logo_mime_type as tenant_logo_mime_type
      FROM user_tenant_membership utm
      JOIN user_roles ur ON utm.role_id = ur.id
      JOIN tenants t ON utm.tenant_id = t.id
      WHERE utm.user_id = $1::uuid AND (utm.tenant_id = $2::uuid OR $2 IS NULL)
      LIMIT 1
    `
    
    const roleResult = await pool.query(roleQuery, [userId, tenantId])
    
    if (roleResult.rows.length > 0) {
      const row = roleResult.rows[0]
      
      // Processar Logotipo — Prioridade: logo_url (text/base64) > logo (bytea)
      let logoDataUrl = null

      if (row.tenant_logo_url) {
        // logo_url já é string (base64 ou URL)
        logoDataUrl = row.tenant_logo_url
      } else if (row.tenant_logo) {
        if (typeof row.tenant_logo === 'string' && row.tenant_logo.startsWith('data:image')) {
          logoDataUrl = row.tenant_logo
        } else if (row.tenant_logo_mime_type) {
          let buffer
          if (Buffer.isBuffer(row.tenant_logo)) {
            buffer = row.tenant_logo
          } else if (typeof row.tenant_logo === 'string' && row.tenant_logo.startsWith('\\x')) {
            buffer = Buffer.from(row.tenant_logo.substring(2), 'hex')
          } else {
            buffer = Buffer.from(row.tenant_logo)
          }
          const base64 = buffer.toString('base64')
          logoDataUrl = `data:${row.tenant_logo_mime_type};base64,${base64}`
        }
      }

      // Adicionar dados do role e tenant ao user
      user = { 
        ...user, 
        role_id: row.role_id,
        role_name: row.role_name,
        role_description: row.role_description,
        role_level: row.role_level,
        is_system_role: row.is_system_role,
        requires_2fa: row.requires_2fa,
        currentTenant: {
          id: row.tenant_id,
          name: row.tenant_name,
          slug: row.tenant_slug,
          logo: logoDataUrl,
          logo_mime_type: row.tenant_logo_mime_type
        }
      }
    } else {
      // Usuário sem role - definir valores padrão
      user.role_id = null
      user.role_name = 'Usuário'
      user.role_description = 'Usuário sem perfil definido'
      user.role_level = 1
      user.requires_2fa = false
      user.currentTenant = null
    }
    // Buscar permissões do usuário no contexto do Tenant
    const permissions = await getUserPermissions(userId, tenantId)
    
    // Buscar configurações de auditoria dinâmicas
    const auditConfigs = await getAuditConfigs(tenantId)
    
    return {
      ...user,
      permissoes: permissions,
      auditConfigs: auditConfigs
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
    'Mudança de Status': 'mudanca-status',
    
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
