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
  role_name?: string
  role_description?: string
  role_level?: number
  two_fa_enabled?: boolean
  two_factor_enabled?: boolean  // Compatibilidade com código existente
  two_fa_method?: string
}

export interface UserWithRole extends User {
  role_id?: number
  role_name?: string
  role_description?: string
  role_level?: number
}

export async function findUsersWithRoles(): Promise<UserWithRole[]> {
  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.password,
        u.nome,
        u.telefone,
        u.ativo,
        u.isencao,
        u.is_plantonista,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        ur.id as role_id,
        ur.name as role_name,
        ur.description as role_description,
        ur.level as role_level,
        COALESCE(ufc.is_enabled, u.two_fa_enabled, false) as two_fa_enabled,
        COALESCE(ufc.is_enabled, u.two_fa_enabled, false) as two_factor_enabled,
        COALESCE(ufc.is_enabled, false) as user_2fa_enabled_from_config,
        CASE 
          WHEN COALESCE(ufc.is_enabled, u.two_fa_enabled, false) = true THEN 'Ativado'
          ELSE 'Desativado'
        END as two_fa_method
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      LEFT JOIN user_2fa_config ufc ON u.id = ufc.user_id AND ufc.method = 'email'
      ORDER BY u.nome
    `
    
    console.log('🔍 DEBUG - Query executada:', query)
    const result = await pool.query(query)
    console.log('🔍 DEBUG - Resultado da query:', result.rows.length, 'usuários encontrados')
    console.log('🔍 DEBUG - Primeiros usuários:', result.rows.slice(0, 3))
    return result.rows
  } catch (error) {
    console.error('❌ ERRO na query de usuários:', error)
    console.error('Erro ao buscar usuários com perfis:', error)
    throw error
  }
}

export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const query = 'SELECT * FROM users WHERE username = $1'
    const result = await pool.query(query, [username])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('Erro ao buscar usuário por username:', error)
    throw error
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    const query = 'SELECT * FROM users WHERE id = $1'
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error)
    throw error
  }
}

export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { roleId: number }): Promise<User> {
  try {
    console.log('=== INÍCIO DA FUNÇÃO CREATEUSER ===')
    console.log('Dados recebidos:', { ...userData, password: '[HIDDEN]' })
    
    // Testar conexão com o banco
    const testConnection = await pool.query('SELECT NOW()')
    console.log('Conexão com banco OK:', testConnection.rows[0])
    
    // Normalizações
    const cpfDigits = userData.cpf ? String(userData.cpf).replace(/\D/g, '') : null

    // Verificar se username/email/cpf já existe
    const checkQuery = `
      SELECT id
      FROM users
      WHERE username = $1
         OR email = $2
         OR ($3::text IS NOT NULL AND cpf = $3)
      LIMIT 1
    `
    const checkResult = await pool.query(checkQuery, [userData.username, userData.email, cpfDigits])
    
    if (checkResult.rows.length > 0) {
      throw new Error('Username, email ou CPF já existe no sistema')
    }
    console.log('Verificação de duplicação OK')
    
    // Criptografar senha
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    console.log('Senha criptografada OK')
    
    // Inserir usuário
    const insertUserQuery = `
      INSERT INTO users (username, email, password, nome, telefone, ativo, cpf, creci, foto, foto_tipo_mime, isencao, is_plantonista)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `
    
    const userValues = [
      userData.username,
      userData.email,
      hashedPassword,
      userData.nome,
      userData.telefone,
      userData.ativo,
      cpfDigits,
      userData.creci || null,
      userData.foto || null,
      userData.foto_tipo_mime || null,
      userData.isencao || false,
      userData.is_plantonista || false
    ]
    
    console.log('Executando inserção do usuário...')
    const userResult = await pool.query(insertUserQuery, userValues)
    const newUser = userResult.rows[0]
    console.log('Usuário inserido com sucesso:', newUser.id)
    
    // Verificar se o perfil existe e se requer 2FA
    const roleCheckQuery = 'SELECT id, requires_2fa FROM user_roles WHERE id = $1 AND is_active = true'
    const roleCheckResult = await pool.query(roleCheckQuery, [userData.roleId])
    
    if (roleCheckResult.rows.length === 0) {
      throw new Error('Perfil especificado não existe ou não está ativo')
    }
    
    const role = roleCheckResult.rows[0]
    console.log('Perfil verificado OK:', role)
    
    // Se o perfil requer 2FA, atualizar o usuário para ter 2FA habilitado
    if (role.requires_2fa) {
      console.log('Perfil requer 2FA - habilitando automaticamente')
      const update2FAQuery = `
        UPDATE users 
        SET two_fa_enabled = true 
        WHERE id = $1
      `
      await pool.query(update2FAQuery, [newUser.id])
      console.log('2FA habilitado automaticamente para o usuário')
    }
    
    // Atribuir perfil ao usuário
    const assignRoleQuery = `
      INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `
    
    console.log('Atribuindo perfil...')
    await pool.query(assignRoleQuery, [newUser.id, userData.roleId, newUser.id])
    console.log('Perfil atribuído com sucesso')
    
    console.log('=== FUNÇÃO CREATEUSER CONCLUÍDA ===')
    return newUser
  } catch (error) {
    console.error('=== ERRO NA FUNÇÃO CREATEUSER ===')
    console.error('Tipo do erro:', typeof error)
    console.error('Mensagem do erro:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

export async function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'> & { roleId?: number }>): Promise<User | null> {
  try {
    console.log('🔧 updateUser chamada:', { id, userData })
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1
    
    // Construir query dinamicamente baseado nos campos fornecidos
    if (userData.username !== undefined) {
      fields.push(`username = $${paramCount}`)
      values.push(userData.username)
      paramCount++
    }
    
    if (userData.email !== undefined) {
      fields.push(`email = $${paramCount}`)
      values.push(userData.email)
      paramCount++
    }
    
    if (userData.password !== undefined) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      fields.push(`password = $${paramCount}`)
      values.push(hashedPassword)
      paramCount++
    }
    
    if (userData.nome !== undefined) {
      fields.push(`nome = $${paramCount}`)
      values.push(userData.nome)
      paramCount++
    }
    
    if (userData.telefone !== undefined) {
      fields.push(`telefone = $${paramCount}`)
      values.push(userData.telefone)
      paramCount++
    }
    
    if (userData.cpf !== undefined) {
      const cpfDigits = userData.cpf ? String(userData.cpf).replace(/\D/g, '') : null
      fields.push(`cpf = $${paramCount}`)
      values.push(cpfDigits)
      paramCount++
    }

    if (userData.creci !== undefined) {
      fields.push(`creci = $${paramCount}`)
      values.push(userData.creci)
      paramCount++
    }

    if (userData.foto !== undefined) {
      fields.push(`foto = $${paramCount}`)
      values.push(userData.foto)
      paramCount++
    }

    if (userData.foto_tipo_mime !== undefined) {
      fields.push(`foto_tipo_mime = $${paramCount}`)
      values.push(userData.foto_tipo_mime)
      paramCount++
    }

    if (userData.ativo !== undefined) {
      fields.push(`ativo = $${paramCount}`)
      values.push(userData.ativo)
      paramCount++
    }

    if (userData.isencao !== undefined) {
      fields.push(`isencao = $${paramCount}`)
      values.push(userData.isencao)
      paramCount++
    }

    if (userData.is_plantonista !== undefined) {
      fields.push(`is_plantonista = $${paramCount}`)
      values.push(userData.is_plantonista)
      paramCount++
    }
    
    let result: any = null
    
    // Se há campos para atualizar na tabela users
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
      // Se não há campos para atualizar na tabela users, buscar o usuário atual
      const findQuery = 'SELECT * FROM users WHERE id = $1'
      result = await pool.query(findQuery, [id])
      
      if (result.rows.length === 0) {
        return null
      }
    }
    
    // Se roleId foi fornecido, atualizar o perfil do usuário
    if (userData.roleId !== undefined) {
      try {
        // Verificar se o perfil existe e se requer 2FA
        const roleCheckQuery = 'SELECT id, requires_2fa FROM user_roles WHERE id = $1 AND is_active = true'
        const roleCheckResult = await pool.query(roleCheckQuery, [userData.roleId])
        
        if (roleCheckResult.rows.length === 0) {
          throw new Error('Perfil especificado não existe ou não está ativo')
        }
        
        const role = roleCheckResult.rows[0]
        
        // Primeiro, remover todas as atribuições de perfil existentes para este usuário
        const removeRolesQuery = 'DELETE FROM user_role_assignments WHERE user_id = $1'
        await pool.query(removeRolesQuery, [id])
        
        // Depois, inserir a nova atribuição de perfil
        const assignRoleQuery = `
          INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
          VALUES ($1, $2, $1)
        `
        
        await pool.query(assignRoleQuery, [id, userData.roleId])
        
        // Se o perfil requer 2FA, habilitar automaticamente
        if (role.requires_2fa) {
          const update2FAQuery = `
            UPDATE users 
            SET two_fa_enabled = true 
            WHERE id = $1
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
    // Iniciar transação para garantir consistência
    await pool.query('BEGIN')
    
    try {
      // 1. Excluir logs de auditoria relacionados ao usuário
      await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [id])
      
      // 2. Excluir atribuições de roles do usuário
      await pool.query('DELETE FROM user_role_assignments WHERE user_id = $1', [id])
      
      // 3. Excluir o usuário
      const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
      
      // Confirmar transação
      await pool.query('COMMIT')
      
      return (result.rowCount ?? 0) > 0
    } catch (error) {
      // Reverter transação em caso de erro
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

// Função para verificar permissões do usuário
export async function userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
  try {
    // Mapear ações do sistema para ações do banco
    const actionMapping: Record<string, string[]> = {
      'READ': ['read', 'list'],
      'WRITE': ['create', 'update', 'read', 'list'],
      'DELETE': ['delete', 'create', 'update', 'read', 'list']
    }
    
    const requiredActions = actionMapping[action] || [action.toLowerCase()]
    
    // Buscar permissões do usuário através do seu perfil
    const query = `
      SELECT 
        p.action
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

// ========================================
// FUNÇÕES DE HIERARQUIA E SEGURANÇA
// ========================================

/**
 * Buscar usuário com informações de role/perfil
 * Usado para verificações hierárquicas
 */
export async function getUserWithRole(userId: string): Promise<UserWithRole | null> {
  try {
    const query = `
      SELECT 
        u.id, u.username, u.nome, u.email, u.ativo,
        ur.id as role_id, 
        ur.name as role_name, 
        ur.description as role_description,
        ur.level as role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.id = $1
    `
    const result = await pool.query(query, [userId])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar usuário com role:', error)
    return null
  }
}

/**
 * Contar quantos Super Admins ativos existem no sistema
 */
export async function countActiveAdmins(): Promise<number> {
  try {
    const query = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.ativo = true 
        AND ur.name = 'Super Admin'
        AND ur.is_active = true
    `
    const result = await pool.query(query)
    return parseInt(result.rows[0]?.total || '0')
  } catch (error) {
    console.error('Erro ao contar admins ativos:', error)
    return 0
  }
}

/**
 * Verificar se usuário pode gerenciar outro usuário (hierarquia)
 * Retorna { allowed: boolean, reason?: string }
 */
export async function canManageUser(
  loggedUserId: string, 
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Regra 1: Não pode gerenciar a si mesmo
    if (loggedUserId === targetUserId) {
      return { 
        allowed: false, 
        reason: 'Você não pode gerenciar sua própria conta' 
      }
    }

    // Buscar dados de ambos usuários
    const [loggedUser, targetUser] = await Promise.all([
      getUserWithRole(loggedUserId),
      getUserWithRole(targetUserId)
    ])

    if (!loggedUser || !targetUser) {
      return { 
        allowed: false, 
        reason: 'Usuário não encontrado' 
      }
    }

    const loggedLevel = loggedUser.role_level || 0
    const targetLevel = targetUser.role_level || 0

    // Regra 2: Super Admin só pode ser gerenciado por outro Super Admin
    if (targetUser.role_name === 'Super Admin' && loggedUser.role_name !== 'Super Admin') {
      return { 
        allowed: false, 
        reason: 'Apenas Super Admins podem gerenciar outros Super Admins' 
      }
    }

    // Regra 3: Não pode gerenciar nível igual ou superior
    if (loggedLevel <= targetLevel) {
      return { 
        allowed: false, 
        reason: 'Você não pode gerenciar usuários de nível igual ou superior ao seu' 
      }
    }

    // Regra 4: Se for excluir Super Admin, verificar se é o último
    if (targetUser.role_name === 'Super Admin') {
      const totalAdmins = await countActiveAdmins()
      if (totalAdmins <= 1) {
        return { 
          allowed: false, 
          reason: 'Não é possível excluir o último Super Admin ativo do sistema' 
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Erro ao verificar hierarquia:', error)
    return { 
      allowed: false, 
      reason: 'Erro ao verificar permissões hierárquicas' 
    }
  }
}





