#!/usr/bin/env node

/**
 * Script para gerar senhas hasheadas para novos usuários
 * Uso: node scripts/generate-password.js [senha]
 */

const bcrypt = require('bcryptjs')

async function generateHashedPasswords() {
  const saltRounds = 12
  
  const passwords = {
    admin: 'admin123',
    corretor1: 'corretor123',
    assistente1: 'assistente123'
  }
  
  console.log('🔐 Gerando senhas hashadas...\n')
  
  for (const [username, password] of Object.entries(passwords)) {
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    console.log(`${username}:`)
    console.log(`  Senha: ${password}`)
    console.log(`  Hash:  ${hashedPassword}`)
    console.log('')
  }
  
  console.log('📝 Use esses hashes no arquivo database/seed.sql')
}

generateHashedPasswords().catch(console.error)






