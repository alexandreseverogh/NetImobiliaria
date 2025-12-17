#!/usr/bin/env node

/**
 * Script de Teste: APIs de Usuário
 * 
 * Este script testa as APIs de usuário diretamente para identificar
 * por que os botões de desativar e excluir não estão funcionando.
 */

// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch || require('node-fetch')

const BASE_URL = 'http://localhost:3001'

async function testUserAPIs() {
  console.log('🧪 TESTANDO APIS DE USUÁRIO\n')
  
  try {
    // 1. Testar login para obter token
    console.log('🔐 Testando login...')
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
      console.log(`❌ Login falhou: ${loginResponse.status} ${loginResponse.statusText}`)
      const errorData = await loginResponse.text()
      console.log('Erro:', errorData)
      return
    }
    
    const loginData = await loginResponse.json()
    console.log('✅ Login realizado com sucesso')
    console.log('Usuário:', loginData.user.username)
    
    // Extrair cookies
    const cookies = loginResponse.headers.get('set-cookie')
    console.log('Cookies recebidos:', cookies ? 'Sim' : 'Não')
    
    // 2. Testar listagem de usuários
    console.log('\n📋 Testando listagem de usuários...')
    const usersResponse = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    })
    
    if (!usersResponse.ok) {
      console.log(`❌ Listagem de usuários falhou: ${usersResponse.status} ${usersResponse.statusText}`)
      const errorData = await usersResponse.text()
      console.log('Erro:', errorData)
      return
    }
    
    const usersData = await usersResponse.json()
    console.log(`✅ Usuários listados: ${usersData.users.length}`)
    
    if (usersData.users.length === 0) {
      console.log('❌ Nenhum usuário encontrado para testar')
      return
    }
    
    // 3. Testar alteração de status
    const testUser = usersData.users[0]
    console.log(`\n🔄 Testando alteração de status para usuário: ${testUser.username} (ID: ${testUser.id})`)
    
    const statusResponse = await fetch(`${BASE_URL}/api/admin/usuarios/${testUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ativo: !testUser.ativo
      })
    })
    
    if (!statusResponse.ok) {
      console.log(`❌ Alteração de status falhou: ${statusResponse.status} ${statusResponse.statusText}`)
      const errorData = await statusResponse.text()
      console.log('Erro:', errorData)
    } else {
      const statusData = await statusResponse.json()
      console.log(`✅ Status alterado com sucesso: ${statusData.message}`)
      
      // Reverter alteração
      console.log('🔄 Revertendo alteração...')
      const revertResponse = await fetch(`${BASE_URL}/api/admin/usuarios/${testUser.id}/status`, {
        method: 'PATCH',
        headers: {
          'Cookie': cookies || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ativo: testUser.ativo
        })
      })
      
      if (revertResponse.ok) {
        console.log('✅ Status revertido com sucesso')
      } else {
        console.log('❌ Erro ao reverter status')
      }
    }
    
    // 4. Testar exclusão de usuário (apenas se não for o admin)
    if (testUser.username !== 'admin') {
      console.log(`\n🗑️ Testando exclusão de usuário: ${testUser.username}`)
      
      const deleteResponse = await fetch(`${BASE_URL}/api/admin/usuarios/${testUser.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': cookies || '',
          'Content-Type': 'application/json',
        }
      })
      
      if (!deleteResponse.ok) {
        console.log(`❌ Exclusão falhou: ${deleteResponse.status} ${deleteResponse.statusText}`)
        const errorData = await deleteResponse.text()
        console.log('Erro:', errorData)
      } else {
        console.log('✅ Usuário excluído com sucesso')
        // Nota: Em um teste real, você pode querer recriar o usuário
      }
    } else {
      console.log('\n⚠️ Pulando teste de exclusão para usuário admin (protegido)')
    }
    
    // 5. Verificar permissões do usuário logado
    console.log('\n🔐 Verificando permissões do usuário logado...')
    const meResponse = await fetch(`${BASE_URL}/api/admin/auth/me`, {
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    })
    
    if (meResponse.ok) {
      const meData = await meResponse.json()
      console.log('✅ Dados do usuário logado:')
      console.log(`  • Username: ${meData.user.username}`)
      console.log(`  • Cargo: ${meData.user.cargo || 'N/A'}`)
      console.log(`  • Permissões:`, meData.user.permissoes)
    } else {
      console.log(`❌ Erro ao verificar usuário: ${meResponse.status}`)
    }
    
    console.log('\n🎯 TESTE DAS APIS CONCLUÍDO!')
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Executar teste
testUserAPIs().catch(console.error)
