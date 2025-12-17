const { Pool } = require('pg')

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432')
})

async function checkAdmin() {
  try {
    console.log('🔍 Verificando usuário admin...')
    
    // Verificar usuário admin
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', ['admin'])
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!')
      return
    }
    
    const user = userResult.rows[0]
    console.log('✅ Usuário admin encontrado:')
    console.log('   - ID:', user.id)
    console.log('   - Username:', user.username)
    console.log('   - Nome:', user.nome)
    console.log('   - Email:', user.email)
    console.log('   - Ativo:', user.ativo)
    console.log('   - Último login:', user.ultimo_login)
    
    // Verificar roles do usuário
    const roleResult = await pool.query(`
      SELECT ur.name as role_name, ur.level
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
    `, [user.id])
    
    console.log('👤 Roles do usuário:')
    if (roleResult.rows.length === 0) {
      console.log('   ❌ Nenhum role atribuído!')
    } else {
      roleResult.rows.forEach(role => {
        console.log(`   - ${role.role_name} (nível: ${role.level})`)
      })
    }
    
    // Verificar permissões
    const permResult = await pool.query(`
      SELECT sf.category, p.action, ur.level
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1
      ORDER BY sf.category, p.action
    `, [user.id])
    
    console.log('🔐 Permissões do usuário:')
    if (permResult.rows.length === 0) {
      console.log('   ❌ Nenhuma permissão encontrada!')
    } else {
      const perms = {}
      permResult.rows.forEach(perm => {
        if (!perms[perm.category]) {
          perms[perm.category] = []
        }
        perms[perm.category].push(perm.action)
      })
      
      Object.keys(perms).forEach(category => {
        console.log(`   - ${category}: ${perms[category].join(', ')}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar admin:', error)
  } finally {
    await pool.end()
  }
}

checkAdmin()
