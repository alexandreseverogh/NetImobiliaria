#!/usr/bin/env node

/**
 * Script para testar a edição de usuário
 */

const BASE_URL = 'http://localhost:3001'

async function testEditUser() {
  console.log('🔧 Testando edição de usuário...\n')
  
  try {
    // Passo 1: Fazer login para obter token
    console.log('📋 Passo 1: Fazendo login...')
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

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text()
      console.log(`❌ Erro no login: ${errorData}`)
      return
    }

    const loginData = await loginResponse.json()
    console.log(`✅ Login realizado: ${loginData.success}`)
    
    // Extrair cookies da resposta
    const cookies = loginResponse.headers.get('set-cookie')
    
    // Passo 2: Testar edição de usuário
    console.log('\n📋 Passo 2: Testando edição de usuário...')
    
    const headers = {
      'Content-Type': 'application/json',
    }
    
    // Adicionar cookies se existirem
    if (cookies) {
      headers['Cookie'] = cookies
    }
    
    // ID do usuário corretor1 para teste
    const userId = '11d1d7b1-0e1d-4f78-9819-098da391ead7'
    
    // Dados de teste para edição
    const testUpdateData = {
      nome: 'João Silva Atualizado',
      telefone: '(81) 99999-9999',
      email: 'joao.atualizado@netimobiliaria.com.br'
    }
    
    console.log(`📝 Dados para atualização:`, JSON.stringify(testUpdateData, null, 2))
    
    const editResponse = await fetch(`${BASE_URL}/api/admin/usuarios/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(testUpdateData)
    })

    console.log(`\n📊 Status da edição: ${editResponse.status}`)
    
    if (editResponse.ok) {
      const editData = await editResponse.json()
      console.log(`✅ Usuário editado: ${JSON.stringify(editData, null, 2)}`)
    } else {
      const errorData = await editResponse.text()
      console.log(`❌ Erro na edição: ${errorData}`)
      
      // Tentar fazer parse do JSON para ver os detalhes
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.details) {
          console.log(`📋 Detalhes do erro:`, errorJson.details)
        }
      } catch (e) {
        console.log(`⚠️  Não foi possível parsear os detalhes do erro`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

// Executar teste
testEditUser().catch(console.error)










