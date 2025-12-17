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

async function checkAndFix() {
  try {
    console.log('🔍 Verificando encoding na tabela system_features...\n')
    
    // 1. Verificar categorias atuais
    const categories = await pool.query('SELECT DISTINCT category FROM system_features ORDER BY category')
    console.log('📋 Categorias atuais:')
    categories.rows.forEach(row => console.log(`• ${row.category}`))
    
    // 2. Corrigir encoding incorreto
    console.log('\n🔧 Aplicando correções...')
    
    // Corrigir todas as categorias com encoding incorreto
    const result = await pool.query(`
      UPDATE system_features 
      SET category = CASE 
        WHEN category ILIKE '%im%veis%' THEN 'imoveis'
        WHEN category ILIKE '%usu%rios%' THEN 'usuarios'
        WHEN category ILIKE '%relat%rios%' THEN 'relatorios'
        WHEN category ILIKE '%amenidades%' THEN 'amenidades'
        WHEN category ILIKE '%proximidades%' THEN 'proximidades'
        WHEN category ILIKE '%sistema%' THEN 'sistema'
        ELSE category
      END
      WHERE category ILIKE '%ã%' OR category ILIKE '%³%' OR category ILIKE '%¡%'
      RETURNING id, name, category
    `)
    
    console.log(`✅ ${result.rows.length} registros corrigidos`)
    
    // 3. Verificar resultado
    const finalCategories = await pool.query('SELECT DISTINCT category FROM system_features ORDER BY category')
    console.log('\n📋 Categorias após correção:')
    finalCategories.rows.forEach(row => console.log(`• ${row.category}`))
    
    console.log('\n🎉 Correção concluída!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await pool.end()
  }
}

checkAndFix()










