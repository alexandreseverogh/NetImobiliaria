#!/usr/bin/env node

/**
 * Script para testar a API de usuários COM autenticação
 */

const BASE_URL = 'http://localhost:3000'

async function testAPIWithAuth() {
  console.log('🔐 Testando API de usuários COM autenticação...\n')
  
  try {
    // Passo 1: Fazer login para obter token
    console.log('📋 Passo 1: Fazendo login...')
    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'admin123'

    const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })

    console.log(`Status do login: ${loginResponse.status}`)
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.text()
      console.log(`❌ Erro no login: ${errorData}`)
      return
    }

    const loginData = await loginResponse.json()
    console.log(`✅ Login realizado: ${loginData.success}`)
    console.log(`👤 Usuário: ${loginData.user?.nome}`)
    console.log(`🔑 Cargo: ${loginData.user?.cargo}`)
    console.log(`📊 Dados completos do login:`, JSON.stringify(loginData, null, 2))
    const token = loginData.data?.token
    
    // Extrair cookies da resposta
    const cookies = loginResponse.headers.get('set-cookie')
    console.log(`\n🍪 Cookies recebidos: ${cookies ? 'Sim' : 'Não'}`)
    if (cookies) {
      console.log(`📝 Conteúdo dos cookies: ${cookies}`)
    }
    
    // Extrair todos os headers da resposta
    console.log('\n📋 Headers da resposta de login:')
    for (const [key, value] of loginResponse.headers.entries()) {
      console.log(`  ${key}: ${value}`)
    }
    
    // Passo 2: Testar API de usuários com cookies
    console.log('\n📋 Passo 2: Testando API de usuários...')
    
    const headers = {
      'Content-Type': 'application/json',
    }
    
    // Adicionar cookies se existirem
    if (cookies) {
      headers['Cookie'] = cookies
      console.log(`🍪 Enviando cookies: ${cookies}`)
    } else {
      console.log(`⚠️  Nenhum cookie para enviar`)
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log(`🔑 Enviando Authorization Bearer com token`)
    }
    
    const usersResponse = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      method: 'GET',
      headers
    })

    console.log(`\n📊 Status da API de usuários: ${usersResponse.status}`)
    console.log(`📋 Headers da resposta da API:`)
    for (const [key, value] of usersResponse.headers.entries()) {
      console.log(`  ${key}: ${value}`)
    }
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json()
      console.log(`✅ Dados recebidos: ${JSON.stringify(usersData, null, 2)}`)
    } else {
      const errorData = await usersResponse.text()
      console.log(`❌ Erro na API: ${errorData}`)
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

// Executar teste
testAPIWithAuth().catch(console.error)
