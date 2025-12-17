const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'Roberto@2007'
})

async function testAdminPermissions() {
  try {
    console.log('🔍 TESTANDO PERMISSÕES DO ADMIN PARA SIDEBAR\n')
    
    // 1. Verificar usuário admin
    console.log('1️⃣ Verificando usuário admin...')
    const userResult = await pool.query(`
      SELECT id, username, email, ativo 
      FROM users 
      WHERE username = 'admin'
    `)
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!')
      return
    }
    
    const adminUser = userResult.rows[0]
    console.log('✅ Usuário admin encontrado:', adminUser.username, 'ID:', adminUser.id)
    console.log('   Email:', adminUser.email)
    console.log('   Ativo:', adminUser.ativo)
    
    // 2. Verificar role do admin
    console.log('\n2️⃣ Verificando role do admin...')
    const roleResult = await pool.query(`
      SELECT ur.id, ur.name, ur.level
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
      ORDER BY ur.level DESC
      LIMIT 1
    `, [adminUser.id])
    
    if (roleResult.rows.length === 0) {
      console.log('❌ Admin não tem role atribuída!')
      return
    }
    
    const adminRole = roleResult.rows[0]
    console.log('✅ Role do admin:', adminRole.name, '(Level:', adminRole.level + ')')
    
    // 3. Verificar permissões críticas para sidebar
    console.log('\n3️⃣ Verificando permissões críticas para sidebar...')
    
    const criticalResources = [
      'Funcionalidades do Sistema',
      'Sessões',
      'Logs de Auditoria',
      'Tipos de Documentos'
    ]
    
    for (const resourceName of criticalResources) {
      const permResult = await pool.query(`
        SELECT 
          sf.name as funcionalidade,
          p.action,
          p.description
        FROM system_features sf
        JOIN permissions p ON sf.id = p.feature_id
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
          AND sf.name = $2
          AND sf.is_active = true
        ORDER BY p.action
      `, [adminRole.id, resourceName])
      
      if (permResult.rows.length > 0) {
        console.log(`✅ ${resourceName}: ${permResult.rows.length} permissões`)
        permResult.rows.forEach(row => {
          console.log(`   - ${row.action}: ${row.description}`)
        })
      } else {
        console.log(`❌ ${resourceName}: NENHUMA PERMISSÃO ENCONTRADA`)
      }
    }
    
    // 4. Verificar todas as funcionalidades do admin
    console.log('\n4️⃣ Verificando todas as funcionalidades do admin...')
    const allPermsResult = await pool.query(`
      SELECT 
        sf.name as funcionalidade,
        COUNT(p.id) as total_permissoes
      FROM system_features sf
      JOIN permissions p ON sf.id = p.feature_id
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
        AND sf.is_active = true
      GROUP BY sf.name
      ORDER BY sf.name
    `, [adminRole.id])
    
    console.log(`\n📊 Total de funcionalidades com permissões: ${allPermsResult.rows.length}`)
    allPermsResult.rows.forEach(row => {
      console.log(`   - ${row.funcionalidade}: ${row.total_permissoes} permissões`)
    })
    
    console.log('\n✅ Teste concluído!')
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await pool.end()
  }
}

testAdminPermissions()
