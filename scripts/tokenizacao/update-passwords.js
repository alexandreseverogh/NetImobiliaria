const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'NetImob2024@Dev'
})

async function updatePasswords() {
  try {
    console.log('🔐 Atualizando senhas dos usuários...')
    
    const client = await pool.connect()
    console.log('✅ Conexão estabelecida com sucesso')
    
    const saltRounds = 12
    
    // Senhas para atualizar
    const users = [
      { username: 'admin', password: 'admin123' },
      { username: 'corretor1', password: 'corretor123' },
      { username: 'assistente1', password: 'assistente123' }
    ]
    
    for (const user of users) {
      console.log(`\n👤 Atualizando senha para: ${user.username}`)
      
      // Gerar hash da nova senha
      const hashedPassword = await bcrypt.hash(user.password, saltRounds)
      
      // Atualizar no banco
      const result = await client.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING username',
        [hashedPassword, user.username]
      )
      
      if (result.rowCount > 0) {
        console.log(`✅ Senha atualizada para: ${user.username}`)
        console.log(`🔒 Hash: ${hashedPassword.substring(0, 30)}...`)
      } else {
        console.log(`❌ Usuário não encontrado: ${user.username}`)
      }
    }
    
    client.release()
    console.log('\n🎉 Todas as senhas foram atualizadas!')
    
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error)
  } finally {
    await pool.end()
  }
}

updatePasswords()
