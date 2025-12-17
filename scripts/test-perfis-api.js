// @ts-check

const dotenv = require('dotenv');

const fetchFn =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : async (input, init) => (await import('node-fetch')).default(input, init);

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Função para fazer login e obter token
async function login(username, password) {
  try {
    const response = await fetchFn(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username ?? process.env.ADMIN_USERNAME ?? 'admin',
        password: password ?? process.env.ADMIN_PASSWORD ?? 'admin123'
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.accessToken || data?.data?.token;
  } catch (error) {
    console.error('Erro no login:', error.message);
    return null;
  }
}

// Função para testar listagem de perfis
async function testListPerfis(token) {
  try {
    console.log('\n🔍 Testando listagem de perfis...');
    
    const response = await fetchFn(`${BASE_URL}/api/admin/perfis`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Listagem falhou: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Listagem de perfis bem-sucedida!');
    console.log(`📊 Total de perfis: ${data.perfis.length}`);
    
    data.perfis.forEach(perfil => {
      console.log(`  - ${perfil.name}: ${perfil.description} (${perfil.userCount} usuários)`);
      console.log(`    Permissões:`, perfil.permissions);
    });

    return data.perfis;
  } catch (error) {
    console.error('❌ Erro na listagem de perfis:', error.message);
    return null;
  }
}

// Função para testar criação de perfil
async function testCreatePerfil(token, baseName) {
  try {
    console.log('\n➕ Testando criação de perfil...');
    const profileName = baseName || `Teste Perfil ${Date.now().toString(36)}`;

    const novoPerfil = {
      name: profileName,
      description: 'Perfil criado para teste da API',
      permissions: {
        imoveis: 'READ',
        proximidades: 'WRITE',
        amenidades: 'READ',
        'categorias-amenidades': 'NONE',
        'categorias-proximidades': 'NONE',
        usuarios: 'NONE',
        relatorios: 'READ',
        sistema: 'NONE'
      }
    };

    const response = await fetchFn(`${BASE_URL}/api/admin/perfis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(novoPerfil),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Criação falhou: ${response.status} ${response.statusText} - ${errorData.message}`);
    }

    const data = await response.json();
    console.log('✅ Criação de perfil bem-sucedida!');
    console.log(`🆔 ID do novo perfil: ${data.perfil.id}`);
    console.log(`📝 Nome: ${data.perfil.name}`);
    console.log(`🔐 Permissões:`, data.perfil.permissions);

    return data.perfil;
  } catch (error) {
    console.error('❌ Erro na criação de perfil:', error.message);
    return null;
  }
}

// Função para testar busca de perfil específico
async function testGetPerfil(token, perfilId) {
  try {
    console.log(`\n🔍 Testando busca do perfil ${perfilId}...`);
    
    const response = await fetchFn(`${BASE_URL}/api/admin/perfis/${perfilId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Busca falhou: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Busca de perfil bem-sucedida!');
    console.log(`📝 Nome: ${data.perfil.name}`);
    console.log(`🔐 Permissões:`, data.perfil.permissions);

    return data.perfil;
  } catch (error) {
    console.error('❌ Erro na busca de perfil:', error.message);
    return null;
  }
}

// Função para testar atualização de perfil
async function testUpdatePerfil(token, perfil) {
  try {
    console.log(`\n✏️ Testando atualização do perfil ${perfil.id}...`);
    const updatedName = `${perfil.name} Atualizado ${Date.now().toString(36)}`;

    const dadosAtualizados = {
      name: updatedName,
      description: 'Perfil atualizado para teste da API',
      permissions: {
        imoveis: 'WRITE',
        proximidades: 'DELETE',
        amenidades: 'READ',
        'categorias-amenidades': 'NONE',
        'categorias-proximidades': 'NONE',
        usuarios: 'NONE',
        relatorios: 'READ',
        sistema: 'NONE'
      }
    };

    const response = await fetchFn(`${BASE_URL}/api/admin/perfis/${perfil.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(dadosAtualizados),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Atualização falhou: ${response.status} ${response.statusText} - ${errorData.message}`);
    }

    const data = await response.json();
    console.log('✅ Atualização de perfil bem-sucedida!');
    console.log(`📝 Mensagem: ${data.message}`);

    return { ...perfil, name: updatedName };
  } catch (error) {
    console.error('❌ Erro na atualização de perfil:', error.message);
    return null;
  }
}

// Função para testar exclusão de perfil
async function testDeletePerfil(token, perfilId) {
  try {
    console.log(`\n🗑️ Testando exclusão do perfil ${perfilId}...`);
    
    const response = await fetchFn(`${BASE_URL}/api/admin/perfis/${perfilId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Exclusão falhou: ${response.status} ${response.statusText} - ${errorData.message}`);
    }

    const data = await response.json();
    console.log('✅ Exclusão de perfil bem-sucedida!');
    console.log(`📝 Mensagem: ${data.message}`);

    return true;
  } catch (error) {
    console.error('❌ Erro na exclusão de perfil:', error.message);
    return false;
  }
}

// Função principal de teste
async function runTests() {
  console.log('🚀 Iniciando testes das APIs de perfis...\n');

  // Login
  console.log('🔐 Fazendo login...');
  const token = await login('admin', 'admin123');
  
  if (!token) {
    console.error('❌ Falha no login. Abortando testes.');
    return;
  }
  
  console.log('✅ Login bem-sucedido!');

  try {
    // Teste 1: Listar perfis
    const perfis = await testListPerfis(token);
    if (!perfis) {
      console.error('❌ Falha na listagem de perfis. Abortando testes.');
      return;
    }

    // Teste 2: Criar perfil
    const baseName = `Teste Perfil ${Date.now().toString(36)}`;
    const novoPerfil = await testCreatePerfil(token, baseName);
    if (!novoPerfil) {
      console.error('❌ Falha na criação de perfil. Abortando testes.');
      return;
    }

    // Teste 3: Buscar perfil específico
    const perfilBuscado = await testGetPerfil(token, novoPerfil.id);
    if (!perfilBuscado) {
      console.error('❌ Falha na busca de perfil. Abortando testes.');
      return;
    }

    // Teste 4: Atualizar perfil
    const perfilAtualizadoInfo = await testUpdatePerfil(token, novoPerfil);
    if (!perfilAtualizadoInfo) {
      console.error('❌ Falha na atualização de perfil. Abortando testes.');
      return;
    }

    // Teste 5: Verificar atualização
    const perfilAtualizado = await testGetPerfil(token, perfilAtualizadoInfo.id);
    if (!perfilAtualizado) {
      console.error('❌ Falha na verificação da atualização. Abortando testes.');
      return;
    }

    // Teste 6: Excluir perfil
    const exclusaoSucesso = await testDeletePerfil(token, perfilAtualizadoInfo.id);
    if (!exclusaoSucesso) {
      console.error('❌ Falha na exclusão de perfil. Abortando testes.');
      return;
    }

    // Teste 7: Verificar exclusão
    console.log('\n🔍 Verificando se o perfil foi excluído...');
    const perfilExcluido = await testGetPerfil(token, perfilAtualizadoInfo.id);
    if (perfilExcluido) {
      console.log('⚠️ Perfil ainda existe após exclusão');
    } else {
      console.log('✅ Perfil foi excluído com sucesso');
    }

    console.log('\n🎉 Todos os testes foram concluídos com sucesso!');

  } catch (error) {
    console.error('\n💥 Erro durante os testes:', error.message);
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };








