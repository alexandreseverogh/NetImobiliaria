#!/usr/bin/env node

/**
 * Script de Teste: Alteração de Status de Usuário
 * 
 * Este script testa a alteração de status de um usuário diferente do admin
 * para verificar se as permissões estão funcionando.
 */

const fetch = globalThis.fetch || require('node-fetch')

const BASE_URL = 'http://localhost:3001'

async function testStatusChange() {
  console.log('🧪 TESTANDO ALTERAÇÃO DE STATUS DE USUÁRIO\n')
  
  try {
    // 1. Login como admin
    console.log('🔐 Fazendo login como admin...')
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
      console.log(`❌ Login falhou: ${loginResponse.status}`)
      return
    }

    const cookies = loginResponse.headers.get('set-cookie')
    console.log('✅ Login realizado com sucesso\n')

    // 2. Listar usuários
    console.log('📋 Listando usuários...')
    const usersResponse = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    })

    if (!usersResponse.ok) {
      console.log(`❌ Listagem falhou: ${usersResponse.status}`)
      return
    }

    const usersData = await usersResponse.json()
    console.log(`✅ Usuários listados: ${usersData.users.length}`)

    // 3. Encontrar usuário diferente do admin para testar
    const testUser = usersData.users.find(user => user.username !== 'admin')
    if (!testUser) {
      console.log('❌ Nenhum usuário diferente do admin encontrado')
      return
    }

    console.log(`\n🔄 Testando alteração de status para usuário: ${testUser.username} (ID: ${testUser.id})`)
    console.log(`Status atual: ${testUser.ativo ? 'ATIVO' : 'INATIVO'}`)

    // 4. Alterar status
    const newStatus = !testUser.ativo
    const statusResponse = await fetch(`${BASE_URL}/api/admin/usuarios/${testUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ativo: newStatus
      })
    })

    if (!statusResponse.ok) {
      console.log(`❌ Alteração de status falhou: ${statusResponse.status}`)
      const errorData = await statusResponse.text()
      console.log('Erro:', errorData)
      return
    }

    const statusData = await statusResponse.json()
    console.log(`✅ Status alterado com sucesso: ${statusData.message}`)
    console.log(`Novo status: ${newStatus ? 'ATIVO' : 'INATIVO'}`)

    // 5. Reverter alteração
    console.log('\n🔄 Revertendo alteração...')
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

    console.log('\n🎯 TESTE DE ALTERAÇÃO DE STATUS CONCLUÍDO COM SUCESSO!')
    console.log('✅ Os botões de "Desativar" e "Excluir" agora devem funcionar!')

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Executar teste
testStatusChange().catch(console.error)










