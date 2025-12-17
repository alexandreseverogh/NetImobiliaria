#!/usr/bin/env node

/**
 * Script para gerar senhas fortes e seguras para o banco de dados
 * Uso: node scripts/generate-strong-password.js
 */

function generateStrongPassword(length = 32) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  // Garantir pelo menos um de cada tipo
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Completar o resto da senha
  const allChars = uppercase + lowercase + numbers + symbols
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Embaralhar a senha
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

function generatePostgresPassword() {
  console.log('🔐 GERANDO SENHA FORTE PARA POSTGRESQL')
  console.log('=====================================\n')
  
  // Gerar senha de 32 caracteres
  const password = generateStrongPassword(32)
  
  console.log('✅ Senha forte gerada com sucesso!')
  console.log('📝 Use esta senha no seu arquivo .env.local:')
  console.log('')
  console.log(`POSTGRES_PASSWORD=${password}`)
  console.log('')
  console.log('🔒 Características da senha:')
  console.log(`   • Comprimento: ${password.length} caracteres`)
  console.log(`   • Maiúsculas: ${(password.match(/[A-Z]/g) || []).length}`)
  console.log(`   • Minúsculas: ${(password.match(/[a-z]/g) || []).length}`)
  console.log(`   • Números: ${(password.match(/[0-9]/g) || []).length}`)
  console.log(`   • Símbolos: ${(password.match(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/g) || []).length}`)
  console.log('')
  console.log('⚠️  IMPORTANTE:')
  console.log('   • Guarde esta senha em local seguro')
  console.log('   • Não compartilhe ou commite no Git')
  console.log('   • Atualize o arquivo .env.local')
  console.log('   • Reinicie o servidor após a mudança')
  console.log('')
  console.log('🔄 Para aplicar a nova senha:')
  console.log('   1. Atualize o arquivo .env.local')
  console.log('   2. Atualize a senha no PostgreSQL')
  console.log('   3. Reinicie o servidor da aplicação')
}

// Executar se chamado diretamente
if (require.main === module) {
  generatePostgresPassword()
}

module.exports = { generateStrongPassword, generatePostgresPassword }
