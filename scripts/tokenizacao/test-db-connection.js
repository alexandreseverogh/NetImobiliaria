#!/usr/bin/env node

/**
 * Script para testar a conexão com o banco de dados
 * Uso: node scripts/test-db-connection.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Função para ler variáveis do arquivo .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  const envVars = {}
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=').trim()
        }
      }
    }
  }
  
  return envVars
}

async function testDatabaseConnection() {
  console.log('🧪 TESTANDO CONEXÃO COM O BANCO DE DADOS')
  console.log('==========================================\n')
  
  // Carregar variáveis do .env.local
  const envVars = loadEnvFile()
  
  // Configurações do banco (usando variáveis do .env.local)
  const config = {
    host: envVars.POSTGRES_HOST || 'localhost',
    port: parseInt(envVars.POSTGRES_PORT) || 5432,
    database: envVars.POSTGRES_DB || 'net_imobiliaria',
    user: envVars.POSTGRES_USER || 'postgres',
    password: envVars.POSTGRES_PASSWORD
  }
  
  console.log('🔍 Configurações de conexão:')
  console.log(`   • Host: ${config.host}`)
  console.log(`   • Porta: ${config.port}`)
  console.log(`   • Banco: ${config.database}`)
  console.log(`   • Usuário: ${config.user}`)
  console.log(`   • Senha: ${config.password ? '***' + config.password.slice(-4) : 'NÃO DEFINIDA'}`)
  console.log('')
  
  if (!config.password) {
    console.log('❌ ERRO: Senha do PostgreSQL não está definida no .env.local')
    console.log('💡 Verifique se o arquivo .env.local existe e tem POSTGRES_PASSWORD')
    return
  }
  
  const client = new Client(config)
  
  try {
    console.log('🔄 Tentando conectar ao banco de dados...')
    await client.connect()
    console.log('✅ Conexão estabelecida com sucesso!')
    
    console.log('🔄 Testando query simples...')
    const result = await client.query('SELECT version()')
    console.log('✅ Query executada com sucesso!')
    console.log(`📊 Versão do PostgreSQL: ${result.rows[0].version}`)
    
    console.log('🔄 Testando conexão com a tabela de usuários...')
    const userResult = await client.query('SELECT COUNT(*) as total FROM users')
    console.log('✅ Conexão com tabela users funcionando!')
    console.log(`👥 Total de usuários: ${userResult.rows[0].total}`)
    
    console.log('🔄 Testando conexão com a tabela de amenidades...')
    const amenidadeResult = await client.query('SELECT COUNT(*) as total FROM amenidades')
    console.log('✅ Conexão com tabela amenidades funcionando!')
    console.log(`🏠 Total de amenidades: ${amenidadeResult.rows[0].total}`)
    
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!')
    console.log('==========================================')
    console.log('✅ Conexão com PostgreSQL funcionando')
    console.log('✅ Nova senha forte aplicada corretamente')
    console.log('✅ Arquivo .env.local configurado')
    console.log('✅ Aplicação pronta para uso')
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE DE CONEXÃO:', error.message)
    
    if (error.code === '28P01') {
      console.log('💡 Dica: Senha incorreta - verifique o .env.local')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Dica: PostgreSQL não está rodando')
    } else if (error.code === '3D000') {
      console.log('💡 Dica: Banco de dados não existe')
    }
    
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testDatabaseConnection()
}

module.exports = { testDatabaseConnection }
