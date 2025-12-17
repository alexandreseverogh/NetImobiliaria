#!/usr/bin/env node

/**
 * Script para alterar automaticamente a senha do PostgreSQL
 * Uso: node scripts/update-postgres-password.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Nova senha forte
const NEW_PASSWORD = '6pR:b-=<*,.<_35%MrFKrIq0Z#fLi+}V'

// Configurações de conexão (usando senha atual)
const config = {
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'postgres' // Senha atual (será alterada)
}

async function updatePostgresPassword() {
  console.log('🔐 ATUALIZANDO SENHA DO POSTGRESQL')
  console.log('==================================\n')
  
  const client = new Client(config)
  
  try {
    console.log('🔄 Conectando ao PostgreSQL...')
    await client.connect()
    console.log('✅ Conectado com sucesso!')
    
    console.log('🔄 Alterando senha do usuário postgres...')
    await client.query(`ALTER USER postgres PASSWORD '${NEW_PASSWORD}'`)
    console.log('✅ Senha alterada com sucesso!')
    
    console.log('🔄 Verificando alteração...')
    const result = await client.query(
      'SELECT usename, passwd IS NOT NULL as has_password FROM pg_user WHERE usename = $1',
      ['postgres']
    )
    
    if (result.rows[0] && result.rows[0].has_password) {
      console.log('✅ Verificação: Usuário postgres tem senha definida')
    }
    
    console.log('\n🎉 SENHA DO POSTGRESQL ATUALIZADA COM SUCESSO!')
    console.log('🔒 Nova senha:', NEW_PASSWORD)
    
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error.message)
    
    if (error.code === '28P01') {
      console.log('💡 Dica: Verifique se a senha atual está correta')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Dica: Verifique se o PostgreSQL está rodando')
    }
    
    process.exit(1)
  } finally {
    await client.end()
  }
}

async function updateEnvFile() {
  console.log('\n📝 ATUALIZANDO ARQUIVO .env.local...')
  
  const envPath = path.join(process.cwd(), '.env.local')
  
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(envPath)) {
      console.log('⚠️  Arquivo .env.local não encontrado')
      console.log('📝 Criando arquivo com as novas configurações...')
      
      const envContent = `# =====================================================
# CONFIGURAÇÕES DO BANCO DE DADOS - NET IMOBILIÁRIA
# =====================================================

# Configurações PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=net_imobiliaria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${NEW_PASSWORD}

# Configurações JWT
JWT_SECRET=net_imobiliaria_jwt_secret_2024_super_secure_key_for_development
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Configurações de Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações do Ambiente
NODE_ENV=development`
      
      fs.writeFileSync(envPath, envContent)
      console.log('✅ Arquivo .env.local criado com sucesso!')
    } else {
      console.log('📝 Atualizando arquivo .env.local existente...')
      
      let envContent = fs.readFileSync(envPath, 'utf8')
      
      // Substituir a senha antiga pela nova
      const oldPasswordRegex = /POSTGRES_PASSWORD=.*/g
      if (oldPasswordRegex.test(envContent)) {
        envContent = envContent.replace(oldPasswordRegex, `POSTGRES_PASSWORD=${NEW_PASSWORD}`)
        fs.writeFileSync(envPath, envContent)
        console.log('✅ Senha atualizada no arquivo .env.local!')
      } else {
        console.log('⚠️  Linha POSTGRES_PASSWORD não encontrada no arquivo')
        console.log('📝 Adicionando configuração de senha...')
        envContent += `\nPOSTGRES_PASSWORD=${NEW_PASSWORD}`
        fs.writeFileSync(envPath, envContent)
        console.log('✅ Configuração de senha adicionada!')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar arquivo .env.local:', error.message)
    console.log('💡 Atualize manualmente o arquivo com a nova senha')
  }
}

async function main() {
  try {
    await updatePostgresPassword()
    await updateEnvFile()
    
    console.log('\n🎯 PROCESSO CONCLUÍDO COM SUCESSO!')
    console.log('====================================')
    console.log('✅ Senha do PostgreSQL alterada')
    console.log('✅ Arquivo .env.local atualizado')
    console.log('')
    console.log('🔄 PRÓXIMOS PASSOS:')
    console.log('   1. Reinicie o servidor da aplicação')
    console.log('   2. Teste a conexão com o banco')
    console.log('   3. Verifique se tudo está funcionando')
    console.log('')
    console.log('🔒 SUA SENHA AGORA É MUITO MAIS SEGURA!')
    
  } catch (error) {
    console.error('❌ Erro no processo:', error.message)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

module.exports = { updatePostgresPassword, updateEnvFile }
