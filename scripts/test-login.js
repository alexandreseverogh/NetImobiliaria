const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'NetImob2024@Dev'
})

async function testLogin() {
  try {
    console.log('🔍 Testando login no banco...')
    
    const client = await pool.connect()
    console.log('✅ Conexão estabelecida com sucesso')
    
    // Testar usuário admin
    const username = 'admin'
    const password = 'admin123'
    
    console.log(`\n👤 Testando login para: ${username}`)
    
    // Buscar usuário
    const userResult = await client.query(
      'SELECT id, username, email, password, nome, cargo, ativo FROM users WHERE username = $1',
      [username]
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado')
      return
    }
    
    const user = userResult.rows[0]
    console.log(`✅ Usuário encontrado: ${user.nome} (${user.cargo})`)
    console.log(`📧 Email: ${user.email}`)
    console.log(`🔒 Ativo: ${user.ativo ? 'SIM' : 'NÃO'}`)
    
    // Verificar senha
    console.log('\n🔐 Verificando senha...')
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log(`✅ Senha válida: ${isValidPassword ? 'SIM' : 'NÃO'}`)
    
    if (isValidPassword) {
      console.log('🎉 Login deve funcionar!')
    } else {
      console.log('❌ Senha incorreta - verificar hash no banco')
      console.log(`🔍 Hash atual: ${user.password.substring(0, 30)}...`)
    }
    
    client.release()
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await pool.end()
  }
}

testLogin()
