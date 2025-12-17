#!/usr/bin/env node

/**
 * Script de Teste - CRUD de Usuários
 * Testa todas as funcionalidades implementadas com banco de dados real
 */

const BASE_URL = 'http://localhost:3000'
const TEST_USER = {
  username: 'teste_usuario',
  email: 'teste@netimobiliaria.com.br',
  password: 'Teste123!',
  nome: 'Usuário de Teste',
  telefone: '(81) 96666-6666',
  cargo: 'ASSISTENTE',
  roleId: 3 // ID do perfil Assistente
}

let accessToken = null
let createdUserId = null

// Função para fazer login
async function login() {
  console.log('🔐 Fazendo login...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })

    if (!response.ok) {
      throw new Error(`Login falhou: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Login realizado com sucesso')
      console.log(`👤 Usuário: ${data.user.nome}`)
      console.log(`🔑 Cargo: ${data.user.cargo}`)
      
      // Extrair token dos cookies
      const cookies = response.headers.get('set-cookie')
      if (cookies) {
        const accessTokenMatch = cookies.match(/accessToken=([^;]+)/)
        if (accessTokenMatch) {
          accessToken = accessTokenMatch[1]
          console.log('🔐 Token de acesso obtido')
        }
      }
      
      return true
    } else {
      throw new Error('Login não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.message)
    return false
  }
}

// Função para testar listagem de usuários
async function testListUsers() {
  console.log('\n📋 Testando listagem de usuários...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      headers: {
        'Cookie': `accessToken=${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Listagem falhou: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Listagem realizada com sucesso`)
      console.log(`📊 Total de usuários: ${data.total}`)
      console.log(`👥 Usuários encontrados:`)
      data.users.forEach(user => {
        console.log(`   - ${user.nome} (@${user.username}) - ${user.cargo}`)
      })
      return true
    } else {
      throw new Error('Listagem não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na listagem:', error.message)
    return false
  }
}

// Função para testar listagem de perfis
async function testListRoles() {
  console.log('\n👥 Testando listagem de perfis...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/roles`, {
      headers: {
        'Cookie': `accessToken=${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Listagem de perfis falhou: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Listagem de perfis realizada com sucesso`)
      console.log(`📊 Total de perfis: ${data.total}`)
      console.log(`🎭 Perfis encontrados:`)
      data.roles.forEach(role => {
        console.log(`   - ${role.name} (Nível ${role.level}) - ${role.description}`)
      })
      return true
    } else {
      throw new Error('Listagem de perfis não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na listagem de perfis:', error.message)
    return false
  }
}

// Função para testar criação de usuário
async function testCreateUser() {
  console.log('\n➕ Testando criação de usuário...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${accessToken}`
      },
      body: JSON.stringify(TEST_USER)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Criação falhou: ${response.status} - ${errorData.error}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Usuário criado com sucesso`)
      console.log(`🆔 ID: ${data.user.id}`)
      console.log(`👤 Nome: ${data.user.nome}`)
      console.log(`📧 Email: ${data.user.email}`)
      console.log(`📱 Telefone: ${data.user.telefone}`)
      console.log(`💼 Cargo: ${data.user.cargo}`)
      
      createdUserId = data.user.id
      return true
    } else {
      throw new Error('Criação não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na criação:', error.message)
    return false
  }
}

// Função para testar busca de usuário específico
async function testGetUser() {
  if (!createdUserId) {
    console.log('⚠️  Usuário não foi criado, pulando teste de busca')
    return false
  }

  console.log('\n🔍 Testando busca de usuário específico...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/usuarios/${createdUserId}`, {
      headers: {
        'Cookie': `accessToken=${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Busca falhou: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Busca realizada com sucesso`)
      console.log(`👤 Usuário encontrado: ${data.user.nome}`)
      console.log(`📧 Email: ${data.user.email}`)
      console.log(`📱 Telefone: ${data.user.telefone}`)
      return true
    } else {
      throw new Error('Busca não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na busca:', error.message)
    return false
  }
}

// Função para testar atualização de usuário
async function testUpdateUser() {
  if (!createdUserId) {
    console.log('⚠️  Usuário não foi criado, pulando teste de atualização')
    return false
  }

  console.log('\n✏️  Testando atualização de usuário...')
  
  try {
    const updateData = {
      nome: 'Usuário de Teste Atualizado',
      telefone: '(81) 95555-5555',
      cargo: 'CORRETOR'
    }

    const response = await fetch(`${BASE_URL}/api/admin/usuarios/${createdUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${accessToken}`
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Atualização falhou: ${response.status} - ${errorData.error}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Usuário atualizado com sucesso`)
      console.log(`👤 Nome atualizado: ${data.user.nome}`)
      console.log(`📱 Telefone atualizado: ${data.user.telefone}`)
      console.log(`💼 Cargo atualizado: ${data.user.cargo}`)
      return true
    } else {
      throw new Error('Atualização não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na atualização:', error.message)
    return false
  }
}

// Função para testar alteração de status
async function testToggleStatus() {
  if (!createdUserId) {
    console.log('⚠️  Usuário não foi criado, pulando teste de alteração de status')
    return false
  }

  console.log('\n🔄 Testando alteração de status...')
  
  try {
    // Primeiro, desativar o usuário
    const response = await fetch(`${BASE_URL}/api/admin/usuarios/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${accessToken}`
      },
      body: JSON.stringify({ ativo: false })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Alteração de status falhou: ${response.status} - ${errorData.error}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Status alterado para: ${data.user.ativo ? 'Ativo' : 'Inativo'}`)
      
      // Agora, reativar o usuário
      const reactivateResponse = await fetch(`${BASE_URL}/api/admin/usuarios/${createdUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `accessToken=${accessToken}`
        },
        body: JSON.stringify({ ativo: true })
      })

      if (reactivateResponse.ok) {
        const reactivateData = await reactivateResponse.json()
        console.log(`✅ Status reativado para: ${reactivateData.user.ativo ? 'Ativo' : 'Inativo'}`)
        return true
      } else {
        throw new Error('Reativação falhou')
      }
    } else {
      throw new Error('Alteração de status não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na alteração de status:', error.message)
    return false
  }
}

// Função para testar exclusão de usuário
async function testDeleteUser() {
  if (!createdUserId) {
    console.log('⚠️  Usuário não foi criado, pulando teste de exclusão')
    return false
  }

  console.log('\n🗑️  Testando exclusão de usuário...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/usuarios/${createdUserId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `accessToken=${accessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Exclusão falhou: ${response.status} - ${errorData.error}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Usuário excluído com sucesso`)
      createdUserId = null
      return true
    } else {
      throw new Error('Exclusão não retornou sucesso')
    }
  } catch (error) {
    console.error('❌ Erro na exclusão:', error.message)
    return false
  }
}

// Função principal de teste
async function runTests() {
  console.log('🚀 Iniciando testes do CRUD de Usuários com Banco de Dados Real...\n')
  
  const tests = [
    { name: 'Login', fn: login },
    { name: 'Listar Usuários', fn: testListUsers },
    { name: 'Listar Perfis', fn: testListRoles },
    { name: 'Criar Usuário', fn: testCreateUser },
    { name: 'Buscar Usuário', fn: testGetUser },
    { name: 'Atualizar Usuário', fn: testUpdateUser },
    { name: 'Alterar Status', fn: testToggleStatus },
    { name: 'Excluir Usuário', fn: testDeleteUser }
  ]

  let passedTests = 0
  let totalTests = tests.length

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passedTests++
      }
    } catch (error) {
      console.error(`❌ Erro no teste ${test.name}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMO DOS TESTES')
  console.log('='.repeat(50))
  console.log(`✅ Testes aprovados: ${passedTests}/${totalTests}`)
  console.log(`❌ Testes falharam: ${totalTests - passedTests}/${totalTests}`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Todos os testes passaram! O CRUD de usuários está funcionando perfeitamente com banco de dados real.')
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima para identificar os problemas.')
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = {
  runTests,
  login,
  testListUsers,
  testListRoles,
  testCreateUser,
  testGetUser,
  testUpdateUser,
  testToggleStatus,
  testDeleteUser
}
