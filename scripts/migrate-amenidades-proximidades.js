/**
 * Script de migração para Amenidades e Proximidades
 * Net Imobiliária - Migração de dados estáticos para banco de dados
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
})

async function executeMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Iniciando migração de Amenidades e Proximidades...\n')
    
    // 1. Corrigir schema existente (se necessário)
    console.log('🔧 1. Corrigindo schema existente...')
    const fixSchemaSQL = fs.readFileSync(
      path.join(__dirname, '../database/fix-schema.sql'), 
      'utf8'
    )
    
    await client.query(fixSchemaSQL)
    console.log('✅ Schema corrigido com sucesso!\n')
    
    // 2. Executar schema adicional
    console.log('📝 2. Criando tabelas e views...')
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../database/additional-schema.sql'), 
      'utf8'
    )
    
    await client.query(schemaSQL)
    console.log('✅ Tabelas e views criadas com sucesso!\n')
    
    // 3. Popular dados
    console.log('📊 3. Populando dados...')
    const populateSQL = fs.readFileSync(
      path.join(__dirname, '../database/populate-amenidades-proximidades.sql'), 
      'utf8'
    )
    
    const result = await client.query(populateSQL)
    console.log('✅ Dados populados com sucesso!\n')
    
    // 4. Verificar resultados
    console.log('🔍 4. Verificando resultados...')
    
    const stats = await client.query(`
      SELECT 
        'Categorias de Amenidades' as tabela,
        COUNT(*) as total
      FROM categorias_amenidades
      WHERE ativo = true

      UNION ALL

      SELECT 
        'Amenidades' as tabela,
        COUNT(*) as total
      FROM amenidades
      WHERE ativo = true

      UNION ALL

      SELECT 
        'Categorias de Proximidades' as tabela,
        COUNT(*) as total
      FROM categorias_proximidades
      WHERE ativo = true

      UNION ALL

      SELECT 
        'Proximidades' as tabela,
        COUNT(*) as total
      FROM proximidades
      WHERE ativo = true
    `)
    
    console.log('📊 Estatísticas:')
    stats.rows.forEach(row => {
      console.log(`   ${row.tabela}: ${row.total} registros`)
    })
    
    // 5. Verificar views
    console.log('\n🔍 5. Testando views...')
    
    const viewTests = [
      'SELECT COUNT(*) as total FROM amenidades_completas',
      'SELECT COUNT(*) as total FROM proximidades_completas'
    ]
    
    for (const query of viewTests) {
      const result = await client.query(query)
      const viewName = query.includes('amenidades_completas') ? 'amenidades_completas' : 'proximidades_completas'
      console.log(`   View ${viewName}: ${result.rows[0].total} registros`)
    }
    
    console.log('\n🎉 Migração concluída com sucesso!')
    console.log('\n📋 Próximos passos:')
    console.log('   1. Reiniciar o servidor Next.js')
    console.log('   2. Testar as APIs de amenidades e proximidades')
    console.log('   3. Verificar os componentes de seleção')
    console.log('   4. Testar o cadastro/edição de imóveis')
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    throw error
  } finally {
    client.release()
  }
}

async function main() {
  try {
    await executeMigration()
    process.exit(0)
  } catch (error) {
    console.error('❌ Falha na migração:', error.message)
    process.exit(1)
  }
}

// Verificar se é execução direta
if (require.main === module) {
  main()
}

module.exports = { executeMigration }
