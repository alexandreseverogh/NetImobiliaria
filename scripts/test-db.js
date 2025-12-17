const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: process.env.PGPASSWORD || 'Roberto@2007'
})

async function testDatabase() {
  try {
    console.log('🔍 Testando conexão com o banco...')
    
    // Testar conexão
    const client = await pool.connect()
    console.log('✅ Conexão estabelecida com sucesso')
    
    // Verificar usuários
    console.log('\n👥 Verificando usuários...')
    const usersResult = await client.query('SELECT username, email, ativo FROM users')
    console.log('Usuários encontrados:', usersResult.rows.length)
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username} - ${user.email} - ${user.ativo ? 'ATIVO' : 'INATIVO'}`)
    })
    
    // Verificar estrutura da tabela users
    console.log('\n📋 Estrutura da tabela users...')
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    structureResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`)
    })
    
    // Verificar se há senhas hashadas
    console.log('\n🔐 Verificando senhas...')
    const passwordResult = await client.query('SELECT username, password FROM users LIMIT 3')
    passwordResult.rows.forEach(user => {
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$')
      console.log(`  - ${user.username}: ${isHashed ? 'HASHADA' : 'PLANA'} (${user.password.substring(0, 20)}...)`)
    })
    
    client.release()
    console.log('\n✅ Teste concluído com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await pool.end()
  }
}

testDatabase()
