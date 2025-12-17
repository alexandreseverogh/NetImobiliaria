const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432')
})

async function fixAdminPassword() {
  try {
    console.log('🔧 Corrigindo senha do admin...')
    
    // Gerar novo hash para admin123
    const newPassword = 'admin123'
    const hashedPassword = bcrypt.hashSync(newPassword, 12)
    
    console.log('📝 Nova senha hash gerada')
    
    // Atualizar senha no banco
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, 'admin']
    )
    
    if (result.rowCount > 0) {
      console.log('✅ Senha do admin atualizada com sucesso!')
      console.log('👤 Usuário: admin')
      console.log('🔑 Senha: admin123')
    } else {
      console.log('❌ Usuário admin não encontrado')
    }
    
    // Verificar se a senha está correta
    const user = await pool.query('SELECT password FROM users WHERE username = $1', ['admin'])
    if (user.rows.length > 0) {
      const isValid = bcrypt.compareSync(newPassword, user.rows[0].password)
      console.log('🔍 Verificação da senha:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA')
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir senha:', error)
  } finally {
    await pool.end()
  }
}

fixAdminPassword()
