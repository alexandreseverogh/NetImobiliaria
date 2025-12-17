import pool from './connection'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  username: string
  email: string
  password: string
  nome: string
  telefone: string
  ativo: boolean
  ultimo_login: Date | null
  created_at: Date
  updated_at: Date
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
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        ur.id as role_id,
        ur.name as role_name,
        ur.description as role_description,
        ur.level as role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      ORDER BY u.nome
    `
    
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao buscar usuários com perfis:', error)
    throw error
  }
}

export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const query = `
      SELECT 
        id,
        username,
        email,
        senha_hash as password,
        nome,
        telefone,
        ativo,
        ultimo_login,
        created_at,
        updated_at
      FROM users 
      WHERE username = $1
    `
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
    
    // Verificar se username ou email já existe
    const checkQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2'
    const checkResult = await pool.query(checkQuery, [userData.username, userData.email])
    
    if (checkResult.rows.length > 0) {
      throw new Error('Username ou email já existe no sistema')
    }
    console.log('Verificação de duplicação OK')
    
    // Criptografar senha
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    console.log('Senha criptografada OK')
    
    // Inserir usuário
    const insertUserQuery = `
      INSERT INTO users (username, email, password, nome, telefone, ativo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    
    const userValues = [
      userData.username,
      userData.email,
      hashedPassword,
      userData.nome,
      userData.telefone,
      userData.ativo
    ]
    
    console.log('Executando inserção do usuário...')
    const userResult = await pool.query(insertUserQuery, userValues)
    const newUser = userResult.rows[0]
    console.log('Usuário inserido com sucesso:', newUser.id)
    
    // Verificar se o perfil existe
    const roleCheckQuery = 'SELECT id FROM user_roles WHERE id = $1 AND is_active = true'
    const roleCheckResult = await pool.query(roleCheckQuery, [userData.roleId])
    
    if (roleCheckResult.rows.length === 0) {
      throw new Error('Perfil especificado não existe ou não está ativo')
    }
    console.log('Perfil verificado OK')
    
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
    
    if (userData.ativo !== undefined) {
      fields.push(`ativo = $${paramCount}`)
      values.push(userData.ativo)
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
        // Verificar se o perfil existe
        const roleCheckQuery = 'SELECT id FROM user_roles WHERE id = $1 AND is_active = true'
        const roleCheckResult = await pool.query(roleCheckQuery, [userData.roleId])
        
        if (roleCheckResult.rows.length === 0) {
          throw new Error('Perfil especificado não existe ou não está ativo')
        }
        
        // Primeiro, remover todas as atribuições de perfil existentes para este usuário
        const removeRolesQuery = 'DELETE FROM user_role_assignments WHERE user_id = $1'
        await pool.query(removeRolesQuery, [id])
        
        // Depois, inserir a nova atribuição de perfil
        const assignRoleQuery = `
          INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
          VALUES ($1, $2, $1)
        `
        
        await pool.query(assignRoleQuery, [id, userData.roleId])
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
      WHERE ura.user_id = $1 AND sf.category = $2 AND p.action = ANY($3)
      LIMIT 1
    `
    
    const result = await pool.query(query, [userId, resource, requiredActions])
    
    return result.rows.length > 0
  } catch (error) {
    console.error('Erro ao verificar permissão:', error)
    return false
  }
}









