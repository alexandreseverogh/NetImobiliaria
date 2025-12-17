#!/usr/bin/env node

/**
 * Script para configurar o banco de dados PostgreSQL
 * Execute: node scripts/setup-database.js
 */

const { Pool } = require('pg')
const fs = require('fs').promises
const path = require('path')

// Configuração do banco
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Conectar ao banco padrão primeiro
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432')
}

async function setupDatabase() {
  console.log('🚀 Iniciando configuração do banco de dados...')
  
  let pool
  
  try {
    // 1. Conectar ao banco postgres (padrão)
    console.log('📡 Conectando ao PostgreSQL...')
    pool = new Pool(dbConfig)
    
    // Testar conexão
    await pool.query('SELECT NOW()')
    console.log('✅ Conexão estabelecida com sucesso')
    
    // 2. Criar banco net_imobiliaria se não existir
    console.log('🗄️ Verificando/criando banco net_imobiliaria...')
    try {
      await pool.query('CREATE DATABASE net_imobiliaria')
      console.log('✅ Banco net_imobiliaria criado com sucesso')
    } catch (error) {
      if (error.code === '42P04') {
        console.log('ℹ️ Banco net_imobiliaria já existe')
      } else {
        throw error
      }
    }
    
    // 3. Fechar conexão com postgres
    await pool.end()
    
    // 4. Conectar ao banco net_imobiliaria
    console.log('📡 Conectando ao banco net_imobiliaria...')
    const appDbConfig = { ...dbConfig, database: 'net_imobiliaria' }
    pool = new Pool(appDbConfig)
    
    // 5. Executar schema
    console.log('📋 Executando schema do banco...')
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf8')
    await pool.query(schema)
    console.log('✅ Schema executado com sucesso')
    
    // 6. Executar seed
    console.log('🌱 Executando dados iniciais...')
    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql')
    const seed = await fs.readFile(seedPath, 'utf8')
    await pool.query(seed)
    console.log('✅ Dados iniciais inseridos com sucesso')
    
    // 7. Verificar estrutura
    console.log('🔍 Verificando estrutura do banco...')
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('📊 Tabelas criadas:')
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    // 8. Verificar usuários
    const usersResult = await pool.query('SELECT username, cargo, ativo FROM users')
    console.log('👥 Usuários criados:')
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.cargo}) - ${user.ativo ? 'ATIVO' : 'INATIVO'}`)
    })
    
    console.log('\n🎉 Configuração do banco concluída com sucesso!')
    console.log('\n📝 Próximos passos:')
    console.log('   1. Configure as variáveis de ambiente no .env.local')
    console.log('   2. Execute: npm run dev')
    console.log('   3. Teste o login com: admin / admin123')
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }

