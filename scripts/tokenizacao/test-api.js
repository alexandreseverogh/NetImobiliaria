#!/usr/bin/env node

/**
 * Script para testar a API de usuários
 */

const BASE_URL = 'http://localhost:3001'

async function testAPI() {
  console.log('🔍 Testando API de usuários na porta 3001...\n')
  
  try {
    // Teste 1: API sem autenticação (deve retornar 401)
    console.log('📋 Teste 1: API sem autenticação...')
    const response1 = await fetch(`${BASE_URL}/api/admin/usuarios`)
    console.log(`Status: ${response1.status}`)
    const data1 = await response1.json()
    console.log(`Resposta: ${JSON.stringify(data1, null, 2)}\n`)
    
    // Teste 2: Verificar se o servidor está rodando
    console.log('📋 Teste 2: Verificar se o servidor está rodando...')
    try {
      const response2 = await fetch(`${BASE_URL}/`)
      console.log(`Status da página principal: ${response2.status}\n`)
    } catch (error) {
      console.log(`❌ Erro ao acessar página principal: ${error.message}\n`)
    }
    
    // Teste 3: Verificar se a página de login está acessível
    console.log('📋 Teste 3: Verificar página de login...')
    try {
      const response3 = await fetch(`${BASE_URL}/admin/login`)
      console.log(`Status da página de login: ${response3.status}\n`)
    } catch (error) {
      console.log(`❌ Erro ao acessar página de login: ${error.message}\n`)
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

// Executar teste
testAPI().catch(console.error)
