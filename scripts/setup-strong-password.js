const { Pool } = require('pg')
const crypto = require('crypto')

// Gerar senha forte
function generateStrongPassword() {
  const length = 24
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  let password = ''
  
  // Garantir pelo menos um de cada tipo
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)] // Maiúscula
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)] // Minúscula
  password += '0123456789'[Math.floor(Math.random() * 10)] // Número
  password += '!@#$%^&*()_+-=[]{}|;:,.<>?'[Math.floor(Math.random() * 32)] // Especial
  
  // Completar com caracteres aleatórios
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Embaralhar a senha
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function setupStrongPassword() {
  const strongPassword = generateStrongPassword()
  
  console.log('🔐 Configurando senha forte para PostgreSQL...')
  console.log('📝 Senha gerada:', strongPassword)
  console.log('')
  
  // Testar conexão com senha atual
  const testPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'password', // Senha atual
    port: 5432
  })
  
  try {
    console.log('🔍 Testando conexão com senha atual...')
    await testPool.query('SELECT NOW()')
    console.log('✅ Conexão com senha atual funcionando')
    
    // Alterar senha do usuário postgres
    console.log('🔧 Alterando senha do usuário postgres...')
    await testPool.query(`ALTER USER postgres PASSWORD '${strongPassword}'`)
    console.log('✅ Senha alterada com sucesso!')
    
    // Testar nova senha
    console.log('🔍 Testando nova senha...')
    const newPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: strongPassword,
      port: 5432
    })
    
    await newPool.query('SELECT NOW()')
    console.log('✅ Nova senha funcionando!')
    
    // Atualizar arquivo .env.local
    console.log('📝 Atualizando arquivo .env.local...')
    const fs = require('fs')
    const envContent = `# JWT Configuration
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_2024
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui_2024
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=${strongPassword}

# Environment
NODE_ENV=development

# Logging
LOG_LEVEL=debug`
    
    fs.writeFileSync('.env.local', envContent)
    console.log('✅ Arquivo .env.local criado com senha forte!')
    
    console.log('')
    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA!')
    console.log('📋 Próximos passos:')
    console.log('   1. Reinicie o servidor: npm run dev')
    console.log('   2. Acesse: http://localhost:3000/admin/login')
    console.log('   3. Use: admin / admin123')
    console.log('')
    console.log('🔐 Senha do PostgreSQL salva em .env.local')
    
    await newPool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.log('')
    console.log('💡 POSSÍVEIS SOLUÇÕES:')
    console.log('   1. Verifique se o PostgreSQL está rodando')
    console.log('   2. Verifique se a senha atual está correta')
    console.log('   3. Execute como administrador se necessário')
  } finally {
    await testPool.end()
  }
}

setupStrongPassword()
