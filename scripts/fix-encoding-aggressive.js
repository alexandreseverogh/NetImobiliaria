#!/usr/bin/env node

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function fixEncodingAggressive() {
  try {
    console.log('🔧 CORREÇÃO AGRESSIVA DE ENCODING - ELIMINANDO TODAS AS REDUNDÂNCIAS!\n')
    
    // 1. Verificar situação atual
    console.log('📋 Categorias ANTES da correção:')
    const beforeCategories = await pool.query('SELECT DISTINCT category FROM system_features ORDER BY category')
    beforeCategories.rows.forEach(row => console.log(`• ${row.category}`))
    
    // 2. CORREÇÃO AGRESSIVA - Forçar normalização de TODAS as categorias
    console.log('\n🔧 Aplicando correção AGRESSIVA...')
    
    // Corrigir TODAS as categorias para nomes padrão
    const result = await pool.query(`
      UPDATE system_features 
      SET category = CASE 
        WHEN category ILIKE '%im%veis%' OR category ILIKE '%imã%' OR category ILIKE '%im³%' THEN 'imoveis'
        WHEN category ILIKE '%usu%rios%' OR category ILIKE '%usuã%' OR category ILIKE '%usu¡%' THEN 'usuarios'
        WHEN category ILIKE '%relat%rios%' OR category ILIKE '%relatã%' OR category ILIKE '%relat³%' THEN 'relatorios'
        WHEN category ILIKE '%amenidades%' THEN 'amenidades'
        WHEN category ILIKE '%proximidades%' THEN 'proximidades'
        WHEN category ILIKE '%sistema%' THEN 'sistema'
        WHEN category ILIKE '%categorias%amenidades%' THEN 'categorias-amenidades'
        WHEN category ILIKE '%categorias%proximidades%' THEN 'categorias-proximidades'
        ELSE LOWER(category)
      END
      RETURNING id, name, category
    `)
    
    console.log(`✅ ${result.rows.length} registros processados`)
    
    // 3. Verificar resultado
    console.log('\n📋 Categorias APÓS a correção:')
    const afterCategories = await pool.query('SELECT DISTINCT category FROM system_features ORDER BY category')
    afterCategories.rows.forEach(row => console.log(`• ${row.category}`))
    
    // 4. VERIFICAÇÃO CRÍTICA - Contar registros por categoria
    console.log('\n🔍 VERIFICAÇÃO CRÍTICA - Contagem por categoria:')
    const countResult = await pool.query(`
      SELECT category, COUNT(*) as total
      FROM system_features
      GROUP BY category
      ORDER BY category
    `)
    
    countResult.rows.forEach(row => {
      console.log(`• ${row.category}: ${row.total} registros`)
    })
    
    // 5. ELIMINAR DUPLICATAS se ainda existirem
    console.log('\n🧹 Verificando se ainda há duplicatas...')
    const duplicates = await pool.query(`
      SELECT category, COUNT(*) as total
      FROM system_features
      GROUP BY category
      HAVING COUNT(*) > 1
      ORDER BY category
    `)
    
    if (duplicates.rows.length > 0) {
      console.log('❌ AINDA EXISTEM DUPLICATAS:')
      duplicates.rows.forEach(row => {
        console.log(`  • ${row.category}: ${row.total} registros`)
      })
      
      // Tentar eliminar duplicatas mantendo apenas um registro por categoria
      console.log('\n🧹 Eliminando duplicatas...')
      const deleteResult = await pool.query(`
        DELETE FROM system_features 
        WHERE id NOT IN (
          SELECT DISTINCT ON (category) id 
          FROM system_features 
          ORDER BY category, id
        )
        RETURNING id, category
      `)
      
      console.log(`✅ ${deleteResult.rows.length} duplicatas eliminadas`)
    } else {
      console.log('✅ Nenhuma duplicata encontrada!')
    }
    
    // 6. VERIFICAÇÃO FINAL
    console.log('\n🎯 VERIFICAÇÃO FINAL:')
    const finalCount = await pool.query(`
      SELECT category, COUNT(*) as total
      FROM system_features
      GROUP BY category
      ORDER BY category
    `)
    
    finalCount.rows.forEach(row => {
      console.log(`• ${row.category}: ${row.total} registros`)
    })
    
    console.log('\n🎉 CORREÇÃO AGRESSIVA CONCLUÍDA!')
    console.log('🔄 REINICIE O SERVIDOR para aplicar as mudanças!')
    
  } catch (error) {
    console.error('\n❌ ERRO NA CORREÇÃO:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Executar correção
fixEncodingAggressive().catch(console.error)










