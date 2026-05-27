import pool from './connection'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  username: string
  email: string
  password: string
  nome: string
  telefone: string
  cpf?: string | null
  creci?: string | null
  foto?: Buffer | null
  foto_tipo_mime?: string | null
  ativo: boolean
  isencao?: boolean
  is_plantonista?: boolean
  is_active?: boolean // Alias para ativo
  ultimo_login: Date | null
  created_at: Date
  updated_at: Date
  require_password_change?: boolean
  role_name?: string
  role_description?: string
  role_level?: number
  two_fa_enabled?: boolean
  two_factor_enabled?: boolean  // Compatibilidade com código existente
  two_fa_method?: string
  tipo_corretor?: 'Interno' | 'Externo' | null
  google_refresh_token?: string | null
  google_calendar_authorized?: boolean
  metadata?: any
}

export interface UserWithRole extends User {
  role_id?: number
  role_name?: string
  role_description?: string
  role_level?: number
  is_system_role?: boolean
  is_active_in_tenant?: boolean
  current_tenant_id?: string
}

export async function findUsersWithRoles(tenantId?: string): Promise<UserWithRole[]> {
  try {
    const query = `
      SELECT DISTINCT ON (u.id, u.nome)
        u.id,
        u.username,
        u.email,
        u.password,
        u.nome,
        u.telefone,
        u.ativo,
        u.isencao,
        u.is_plantonista,
        u.tipo_corretor,
        u.google_refresh_token,
        u.google_calendar_authorized,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        ur.id as role_id,
        ur.name as role_name,
        ur.description as role_description,
        ur.level as role_level,
        u.require_password_change,
        COALESCE(ufc.is_enabled, u.two_fa_enabled, false) as two_fa_enabled,
        COALESCE(ufc.is_enabled, u.two_fa_enabled, false) as two_factor_enabled,
        COALESCE(ufc.is_enabled, false) as user_2fa_enabled_from_config,
        CASE 
          WHEN COALESCE(ufc.is_enabled, u.two_fa_enabled, false) = true THEN 'Ativado'
          ELSE 'Desativado'
        END as two_fa_method
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND (ura.tenant_id = $1 OR $1 IS NULL)
      LEFT JOIN user_tenant_membership utm ON u.id = utm.user_id AND (utm.tenant_id = $1 OR $1 IS NULL)
      LEFT JOIN user_roles ur ON ur.id = COALESCE(utm.role_id, ura.role_id)
      LEFT JOIN user_2fa_config ufc ON u.id = ufc.user_id AND ufc.method = 'email'
      WHERE ($1 IS NULL OR utm.tenant_id = $1 OR ura.tenant_id = $1)
      ORDER BY u.nome, u.id
    `

    console.log('🔍 DEBUG - Query executada (findUsersWithRoles):', query)
    const result = await pool.query(query, [tenantId || null])
    return result.rows
  } catch (error) {
    console.error('Erro ao buscar usuários com roles:', error)
    throw error
  }
}

export async function findUsersPaginated(
  page: number = 1,
  limit: number = 10,
  filters: { nome?: string; username?: string; email?: string; role_name?: string; tenant_id?: string; system_tag?: string } = {}
): Promise<{
  users: UserWithRole[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  try {
    const offset = (page - 1) * limit
    const queryParams: any[] = []
    let paramCount = 0
    let whereClause = ''

    const conditions: string[] = []

    if (filters.nome) {
      conditions.push(`u.nome ILIKE $${++paramCount}`)
      queryParams.push(`%${filters.nome}%`)
    }
    if (filters.username) {
      conditions.push(`u.username ILIKE $${++paramCount}`)
      queryParams.push(`%${filters.username}%`)
    }
    if (filters.email) {
      conditions.push(`u.email ILIKE $${++paramCount}`)
      queryParams.push(`%${filters.email}%`)
    }
    if (filters.role_name) {
      conditions.push(`ur.name = $${++paramCount}`)
      queryParams.push(filters.role_name)
    }
    if (filters.tenant_id) {
      conditions.push(`utm.tenant_id = $${++paramCount}`)
      queryParams.push(filters.tenant_id)
    }
    if (filters.system_tag) {
      conditions.push(`srt.tag_key = $${++paramCount}`)
      queryParams.push(filters.system_tag)
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`
    }

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND (ura.tenant_id = $${paramCount + 1} OR $${paramCount + 1} IS NULL)
      LEFT JOIN user_tenant_membership utm ON u.id = utm.user_id AND (utm.tenant_id = $${paramCount + 1} OR $${paramCount + 1} IS NULL)
      LEFT JOIN user_roles ur ON ur.id = COALESCE(utm.role_id, ura.role_id)
      LEFT JOIN system_role_tags srt ON ur.system_tag_id = srt.id
      ${whereClause}
    `

    const dataQuery = `
      SELECT DISTINCT ON (u.nome, u.id)
        u.id,
        u.username,
        u.email,
        u.password,
        u.nome,
        u.telefone,
        u.ativo,
        u.isencao,
        u.is_plantonista,
        u.tipo_corretor,
        u.google_refresh_token,
        u.google_calendar_authorized,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        ur.id as role_id,
        ur.name as role_name,
        ur.description as role_description,
        ur.level as role_level,
        u.require_password_change,
        utm.is_active as is_active_in_tenant,
        utm.tenant_id as current_tenant_id,
        COALESCE(ufc.is_enabled, u.two_fa_enabled, false) as two_fa_enabled,
        COALESCE(ufc.is_enabled, u.two_fa_enabled, false) as two_factor_enabled,
        COALESCE(ufc.is_enabled, false) as user_2fa_enabled_from_config,
        CASE 
          WHEN COALESCE(ufc.is_enabled, u.two_fa_enabled, false) = true THEN 'Ativado'
          ELSE 'Desativado'
        END as two_fa_method
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND (ura.tenant_id = $${paramCount + 1} OR $${paramCount + 1} IS NULL)
      LEFT JOIN user_tenant_membership utm ON u.id = utm.user_id AND (utm.tenant_id = $${paramCount + 1} OR $${paramCount + 1} IS NULL)
      LEFT JOIN user_roles ur ON ur.id = COALESCE(utm.role_id, ura.role_id)
      LEFT JOIN system_role_tags srt ON ur.system_tag_id = srt.id
      LEFT JOIN user_2fa_config ufc ON u.id = ufc.user_id AND ufc.method = 'email'
      ${whereClause}
      ORDER BY u.nome, u.id
      LIMIT $${paramCount + 2} OFFSET $${paramCount + 3}
    `

    const countResult = await pool.query(countQuery, [...queryParams, filters.tenant_id || null])
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

    const dataResult = await pool.query(dataQuery, [...queryParams, filters.tenant_id || null, limit, offset])

    return {
      users: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  } catch (error) {
    console.error('Erro ao buscar usuários paginados:', error)
    throw error
  }
}

export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const query = 'SELECT * FROM users WHERE username = $1'
    const result = await pool.query(query, [username])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar usuário por username:', error)
    throw error
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    const query = 'SELECT * FROM users WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error)
    throw error
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const query = 'SELECT * FROM users WHERE email = $1'
    const result = await pool.query(query, [email])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error)
    throw error
  }
}

export async function findUserByCpf(cpf: string): Promise<User | null> {
  try {
    const cleanCpf = cpf.replace(/\D/g, '')
    const query = 'SELECT * FROM users WHERE cpf = $1'
    const result = await pool.query(query, [cleanCpf])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar usuário por CPF:', error)
    throw error
  }
}

export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { roleId: number; tenantId?: string; google_refresh_token?: string | null; google_calendar_authorized?: boolean; metadata?: any }): Promise<User> {
  try {
    console.log('=== INÍCIO DA FUNÇÃO CREATEUSER ===')
    console.log('Dados recebidos:', { ...userData, password: '[HIDDEN]' })

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [userData.email, userData.username])
    if (existingUser.rows.length > 0) {
      throw new Error('Usuário ou email já cadastrado')
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10)

    const insertUserQuery = `
      INSERT INTO users (username, email, password, nome, telefone, ativo, cpf, creci, foto, foto_tipo_mime, isencao, is_plantonista, tipo_corretor, require_password_change, google_refresh_token, google_calendar_authorized, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `

    const userValues = [
      userData.username,
      userData.email,
      hashedPassword,
      userData.nome,
      userData.telefone,
      userData.ativo,
      userData.cpf ? String(userData.cpf).replace(/\D/g, '') : null,
      userData.creci || null,
      userData.foto || null,
      userData.foto_tipo_mime || null,
      userData.isencao || false,
      userData.is_plantonista || false,
      userData.tipo_corretor || null,
      (userData as any).require_password_change || false,
      userData.google_refresh_token || null,
      userData.google_calendar_authorized || false,
      userData.metadata || {}
    ]

    console.log('Executando inserção do usuário...')
    const userResult = await pool.query(insertUserQuery, userValues)
    const user = userResult.rows[0]

    if (userData.roleId) {
      console.log(`Atribuindo role ${userData.roleId} para usuário ${user.id} no tenant ${userData.tenantId}...`)
      await pool.query(
        'INSERT INTO user_role_assignments (user_id, role_id, assigned_by, tenant_id) VALUES ($1, $2, $1, $3)',
        [user.id, userData.roleId, userData.tenantId || null]
      )

      try {
        const roleQuery = 'SELECT requires_2fa FROM user_roles WHERE id = $1'
        const roleResult = await pool.query(roleQuery, [userData.roleId])

        if (roleResult.rows.length > 0 && roleResult.rows[0].requires_2fa) {
          console.log(`Perfil ${userData.roleId} exige 2FA. Ativando para usuário ${user.id}...`)
          await pool.query('UPDATE users SET two_fa_enabled = true WHERE id = $1', [user.id])
          user.two_fa_enabled = true
        }
      } catch (roleError) {
        console.error('Erro ao verificar requisito de 2FA do perfil:', roleError)
      }
    }

    // MULTI-TENANT: Associar usuário à empresa (Se tenantId fornecido)
    if (userData.tenantId) {
      console.log(`[MULTI-TENANT] Vinculando usuário ${user.id} ao tenant ${userData.tenantId}...`)
      const membershipQuery = `
        INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (user_id, tenant_id) 
        DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true
      `
      await pool.query(membershipQuery, [user.id, userData.tenantId, userData.roleId])
    }

    return user
  } catch (error) {
    throw error
  }
}

export async function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'> & { roleId?: number; google_refresh_token?: string | null; google_calendar_authorized?: boolean }>): Promise<User | null> {
  try {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (userData.username !== undefined) { fields.push(`username = $${paramCount}`); values.push(userData.username); paramCount++ }
    if (userData.email !== undefined) { fields.push(`email = $${paramCount}`); values.push(userData.email); paramCount++ }
    if (userData.nome !== undefined) { fields.push(`nome = $${paramCount}`); values.push(userData.nome); paramCount++ }
    if (userData.telefone !== undefined) { fields.push(`telefone = $${paramCount}`); values.push(userData.telefone); paramCount++ }
    if (userData.ativo !== undefined) { fields.push(`ativo = $${paramCount}`); values.push(userData.ativo); paramCount++ }

    if (userData.cpf !== undefined) {
      fields.push(`cpf = $${paramCount}`)
      values.push(userData.cpf ? String(userData.cpf).replace(/\D/g, '') : null)
      paramCount++
    }
    if (userData.creci !== undefined) { fields.push(`creci = $${paramCount}`); values.push(userData.creci || null); paramCount++ }

    if (userData.isencao !== undefined) { fields.push(`isencao = $${paramCount}`); values.push(userData.isencao); paramCount++ }
    if (userData.is_plantonista !== undefined) { fields.push(`is_plantonista = $${paramCount}`); values.push(userData.is_plantonista); paramCount++ }
    if (userData.tipo_corretor !== undefined) { fields.push(`tipo_corretor = $${paramCount}`); values.push(userData.tipo_corretor); paramCount++ }

    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      fields.push(`password = $${paramCount}`)
      values.push(hashedPassword)
      paramCount++
    }

    if (userData.foto !== undefined) { fields.push(`foto = $${paramCount}`); values.push(userData.foto); paramCount++ }
    if (userData.foto_tipo_mime !== undefined) { fields.push(`foto_tipo_mime = $${paramCount}`); values.push(userData.foto_tipo_mime); paramCount++ }

    if (userData.google_refresh_token !== undefined) { fields.push(`google_refresh_token = $${paramCount}`); values.push(userData.google_refresh_token); paramCount++ }
    if (userData.google_calendar_authorized !== undefined) { fields.push(`google_calendar_authorized = $${paramCount}`); values.push(userData.google_calendar_authorized); paramCount++ }
    if (userData.metadata !== undefined) { fields.push(`metadata = $${paramCount}`); values.push(userData.metadata); paramCount++ }

    let result: any = null

    if (fields.length > 0) {
      fields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `

      result = await pool.query(query, values)

      if (result.rows.length === 0) {
        return null
      }
    } else {
      const findQuery = 'SELECT * FROM users WHERE id = $1'
      result = await pool.query(findQuery, [id])

      if (result.rows.length === 0) {
        return null
      }
    }

    if (userData.roleId !== undefined) {
      try {
        const roleCheckQuery = 'SELECT id, requires_2fa FROM user_roles WHERE id = $1 AND is_active = true'
        const roleCheckResult = await pool.query(roleCheckQuery, [userData.roleId])

        if (roleCheckResult.rows.length === 0) {
          throw new Error('Perfil especificado não existe ou não está ativo')
        }

        const role = roleCheckResult.rows[0]
        const removeRolesQuery = 'DELETE FROM user_role_assignments WHERE user_id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)'
        await pool.query(removeRolesQuery, [id, (userData as any).tenantId || null])

        const assignRoleQuery = `
          INSERT INTO user_role_assignments (user_id, role_id, assigned_by, tenant_id)
          VALUES ($1, $2, $1, $3)
        `

        await pool.query(assignRoleQuery, [id, userData.roleId, (userData as any).tenantId || null])

        if (role.requires_2fa) {
          const update2FAQuery = `
            UPDATE users SET two_fa_enabled = true WHERE id = $1
          `
          await pool.query(update2FAQuery, [id])
        }
      } catch (error) {
        console.error('Erro ao atualizar perfil do usuário:', error)
        throw error
      }
    }

    return result.rows[0]
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    throw error
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await pool.query('BEGIN')

    try {
      await pool.query('DELETE FROM corretor_scores WHERE user_id = $1', [id])
      await pool.query('DELETE FROM corretor_areas_atuacao WHERE corretor_fk = $1', [id])
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [id])
      await pool.query('DELETE FROM login_logs WHERE user_id = $1', [id])
      await pool.query('DELETE FROM audit_2fa_logs WHERE user_id = $1', [id])
      await pool.query('DELETE FROM user_2fa_codes WHERE user_id = $1', [id])
      await pool.query('DELETE FROM user_2fa_config WHERE user_id = $1', [id])
      await pool.query('DELETE FROM imovel_prospect_atribuicoes WHERE corretor_fk = $1', [id])
      await pool.query('UPDATE imoveis SET corretor_fk = NULL WHERE corretor_fk = $1', [id])
      await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [id])
      await pool.query('DELETE FROM user_role_assignments WHERE user_id = $1', [id])

      const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
      await pool.query('COMMIT')

      return (result.rowCount ?? 0) > 0
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    throw error
  }
}

export async function updateLastLogin(id: string): Promise<void> {
  try {
    const query = 'UPDATE users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1'
    await pool.query(query, [id])
  } catch (error) {
    console.error('Erro ao atualizar último login:', error)
    throw error
  }
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password)
}

export async function userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
  try {
    const actionMapping: Record<string, string[]> = {
      'READ': ['read', 'list'],
      'WRITE': ['create', 'update', 'read', 'list'],
      'DELETE': ['delete', 'create', 'update', 'read', 'list']
    }

    const requiredActions = actionMapping[action] || [action.toLowerCase()]

    const query = `
      SELECT p.action
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE ura.user_id = $1 AND COALESCE(sc.slug, 'default') = $2 AND p.action = ANY($3)
      LIMIT 1
    `

    const result = await pool.query(query, [userId, resource, requiredActions])
    return result.rows.length > 0
  } catch (error) {
    console.error('Erro ao verificar permissão:', error)
    return false
  }
}

export async function getUserWithRole(userId: string): Promise<UserWithRole | null> {
  try {
    const query = `
      SELECT 
        u.id, u.username, u.nome, u.email, u.ativo,
        ur.id as role_id, 
        ur.name as role_name, 
        ur.description as role_description,
        ur.level as role_level,
        ur.is_system_role
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_tenant_membership utm ON u.id = utm.user_id
      LEFT JOIN user_roles ur ON ur.id = COALESCE(utm.role_id, ura.role_id)
      WHERE u.id = $1
    `
    const result = await pool.query(query, [userId])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar usuário com role:', error)
    return null
  }
}

export async function countActiveAdmins(): Promise<number> {
  try {
    const query = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.ativo = true AND ur.is_system_role = true AND ur.is_active = true
    `
    const result = await pool.query(query)
    return parseInt(result.rows[0]?.total || '0')
  } catch (error) {
    console.error('Erro ao contar admins ativos:', error)
    return 0
  }
}

export async function canManageUser(
  loggedUserId: string,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    if (loggedUserId === targetUserId) {
      return { allowed: false, reason: 'Você não pode gerenciar sua própria conta' }
    }

    const [loggedUser, targetUser] = await Promise.all([
      getUserWithRole(loggedUserId),
      getUserWithRole(targetUserId)
    ])

    if (!loggedUser || !targetUser) {
      return { allowed: false, reason: 'Usuário não encontrado' }
    }

    const loggedLevel = loggedUser.role_level || 0
    const targetLevel = targetUser.role_level || 0

    const isTargetMaster = targetUser.is_system_role === true
    const isLoggedMaster = loggedUser.is_system_role === true

    if (isTargetMaster && !isLoggedMaster) {
      return { allowed: false, reason: 'Nível de autorização insuficiente para gerenciar perfis Master' }
    }

    // Se o nível for menor, bloqueia. 
    // Se for igual, permitimos apenas se o logado for Admin (level > 0) e não estiver tentando editar um Master
    if (loggedLevel < targetLevel) {
      return { allowed: false, reason: 'Você não pode gerenciar usuários de nível superior ao seu' }
    }
    
    if (loggedLevel === targetLevel && !isLoggedMaster) {
      // Se níveis são iguais e o logado NÃO é master, só permitimos se houver uma justificativa clara (ex: mesma empresa)
      // Por enquanto, vamos permitir IGUALDADE para evitar bloqueios em perfis de mesmo nível (ex: dois admins de empresa)
      // mas mantendo a trava para usuários sem nível definido (0)
      if (loggedLevel === 0) {
        return { allowed: false, reason: 'Nível de autorização insuficiente' }
      }
    }

    if (isTargetMaster) {
      const totalAdmins = await countActiveAdmins()
      if (totalAdmins <= 1) {
        return { allowed: false, reason: 'Não é possível excluir o último administrador Master ativo do sistema' }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Erro ao verificar hierarquia:', error)
    return { allowed: false, reason: 'Erro ao verificar permissões hierárquicas' }
  }
}

/**
 * Alternar o status de um usuário dentro de um Tenant específico
 */
export async function toggleUserTenantStatus(userId: string, tenantId: string, isActive: boolean): Promise<boolean> {
  try {
    const query = `
      INSERT INTO user_tenant_membership (user_id, tenant_id, is_active)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, tenant_id) 
      DO UPDATE SET is_active = $3, updated_at = NOW()
      RETURNING *
    `
    const result = await pool.query(query, [userId, tenantId, isActive])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('Erro ao alternar status do usuário no tenant:', error)
    throw error
  }
}

