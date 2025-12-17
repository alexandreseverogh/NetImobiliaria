#!/usr/bin/env node

/**
 * Script de Correção: Encoding da Tabela system_features
 * 
 * Este script corrige o encoding incorreto na tabela system_features
 * para resolver problemas de permissões duplicadas.
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function fixEncoding() {
  console.log('🔧 CORRIGINDO ENCODING NA TABELA system_features\n')
  
  try {
    // 1. Verificar conexão
    console.log('📡 Verificando conexão com o banco...')
    await pool.query('SELECT NOW()')
    console.log('✅ Conexão OK\n')
    
    // 2. Verificar dados com encoding incorreto
    console.log('🔍 Verificando dados com encoding incorreto...')
    const checkResult = await pool.query(`
      SELECT 
        id,
        name,
        category,
        description
      FROM system_features 
      WHERE category ILIKE '%ã%' OR category ILIKE '%³%' OR category ILIKE '%¡%'
    `)
    
    if (checkResult.rows.length > 0) {
      console.log('❌ Dados com encoding incorreto encontrados:')
      checkResult.rows.forEach(row => {
        console.log(`  • ID: ${row.id}, Category: ${row.category}, Name: ${row.name}`)
      })
    } else {
      console.log('✅ Nenhum dado com encoding incorreto encontrado\n')
      return
    }
    
    // 3. Corrigir categorias com encoding incorreto
    console.log('\n🔧 Aplicando correções...')
    
    // Corrigir imóveis
    const imoveisResult = await pool.query(`
      UPDATE system_features 
      SET category = 'imoveis'
      WHERE category ILIKE '%im%veis%' OR category ILIKE '%imã³veis%'
      RETURNING id, name, category
    `)
    console.log(`✅ Imóveis corrigidos: ${imoveisResult.rows.length}`)
    
    // Corrigir usuários
    const usuariosResult = await pool.query(`
      UPDATE system_features 
      SET category = 'usuarios'
      WHERE category ILIKE '%usu%rios%' OR category ILIKE '%usuã¡rios%'
      RETURNING id, name, category
    `)
    console.log(`✅ Usuários corrigidos: ${usuariosResult.rows.length}`)
    
    // Corrigir relatórios
    const relatoriosResult = await pool.query(`
      UPDATE system_features 
      SET category = 'relatorios'
      WHERE category ILIKE '%relat%rios%' OR category ILIKE '%relatã³rios%'
      RETURNING id, name, category
    `)
    console.log(`✅ Relatórios corrigidos: ${relatoriosResult.rows.length}`)
    
    // 4. Verificar se as correções foram aplicadas
    console.log('\n🔍 Verificando correções aplicadas...')
    const verifyResult = await pool.query(`
      SELECT 
        id,
        name,
        category,
        description
      FROM system_features 
      ORDER BY category, name
    `)
    
    console.log('📋 Categorias após correção:')
    const categories = [...new Set(verifyResult.rows.map(row => row.category))]
    categories.forEach(category => {
      const count = verifyResult.rows.filter(row => row.category === category).length
      console.log(`  • ${category}: ${count} funcionalidades`)
    })
    
    console.log('\n🎉 CORREÇÃO DE ENCODING CONCLUÍDA COM SUCESSO!')
    
  } catch (error) {
    console.error('\n❌ ERRO NA CORREÇÃO:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Executar correção
fixEncoding().catch(console.error)










