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

async function fixSimple() {
  try {
    console.log('🔧 Corrigindo encoding de forma simples...\n')
    
    // 1. Verificar situação atual
    const before = await pool.query('SELECT DISTINCT category FROM system_features ORDER BY category')
    console.log('📋 ANTES:')
    before.rows.forEach(row => console.log(`• ${row.category}`))
    
    // 2. Corrigir encoding
    console.log('\n🔧 Aplicando correções...')
    
    // Corrigir imóveis
    await pool.query("UPDATE system_features SET category = 'imoveis' WHERE category ILIKE '%imã%' OR category ILIKE '%im³%'")
    
    // Corrigir usuários
    await pool.query("UPDATE system_features SET category = 'usuarios' WHERE category ILIKE '%usuã%' OR category ILIKE '%usu¡%'")
    
    // Corrigir relatórios
    await pool.query("UPDATE system_features SET category = 'relatorios' WHERE category ILIKE '%relatã%' OR category ILIKE '%relat³%'")
    
    console.log('✅ Correções aplicadas')
    
    // 3. Verificar resultado
    const after = await pool.query('SELECT DISTINCT category FROM system_features ORDER BY category')
    console.log('\n📋 DEPOIS:')
    after.rows.forEach(row => console.log(`• ${row.category}`))
    
    console.log('\n🎉 Correção concluída!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await pool.end()
  }
}

fixSimple()










