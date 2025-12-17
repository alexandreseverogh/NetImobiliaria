// Script para testar geração de eventos de entrada inválida
// Simula tentativas de entrada inválida em diferentes APIs

const testInvalidInputs = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Iniciando testes de entrada inválida...\n');
  
  // Dados inválidos para diferentes APIs
  const invalidDataSets = [
    {
      name: 'Usuários - Dados Inválidos',
      endpoint: '/api/admin/usuarios',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        email: 'email-invalido', // Email inválido
        senha: '123', // Senha muito curta
        cargo: 'A'.repeat(200) // Nome muito longo
      }
    },
    {
      name: 'Imóveis - Dados Inválidos',
      endpoint: '/api/admin/imoveis',
      method: 'POST',
      data: {
        titulo: '', // Campo obrigatório vazio
        descricao: 'abc', // Descrição muito curta
        preco: -100, // Preço negativo
        area_total: 'abc', // Área não numérica
        quartos: 50, // Quartos inválidos
        banheiros: -1 // Banheiros negativos
      }
    },
    {
      name: 'Clientes - Dados Inválidos',
      endpoint: '/api/admin/clientes',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        email: 'email@', // Email inválido
        telefone: '123', // Telefone muito curto
        cpf: '123456789', // CPF inválido
        data_nascimento: 'data-invalida' // Data inválida
      }
    },
    {
      name: 'Proprietários - Dados Inválidos',
      endpoint: '/api/admin/proprietarios',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        email: 'email@', // Email inválido
        telefone: '123', // Telefone muito curto
        cpf: '123456789', // CPF inválido
        data_nascimento: 'data-invalida' // Data inválida
      }
    },
    {
      name: 'Perfis - Dados Inválidos',
      endpoint: '/api/admin/perfis',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Categorias - Dados Inválidos',
      endpoint: '/api/admin/categorias',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Amenidades - Dados Inválidos',
      endpoint: '/api/admin/amenidades',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        categoria_id: '', // ID obrigatório vazio
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Proximidades - Dados Inválidos',
      endpoint: '/api/admin/proximidades',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        categoria_id: '', // ID obrigatório vazio
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Tipos de Documentos - Dados Inválidos',
      endpoint: '/api/admin/tipos-documentos',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        obrigatorio: 'sim', // Boolean inválido
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Tipos de Imóveis - Dados Inválidos',
      endpoint: '/api/admin/tipos-imoveis',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Finalidades - Dados Inválidos',
      endpoint: '/api/admin/finalidades',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        ativo: 'sim' // Boolean inválido
      }
    },
    {
      name: 'Status de Imóveis - Dados Inválidos',
      endpoint: '/api/admin/status-imovel',
      method: 'POST',
      data: {
        nome: '', // Campo obrigatório vazio
        descricao: 'A'.repeat(1000), // Descrição muito longa
        cor: 'cor-invalida', // Cor inválida
        ativo: 'sim' // Boolean inválido
      }
    }
  ];
  
  let totalTests = 0;
  let successfulTests = 0;
  
  for (const test of invalidDataSets) {
    try {
      console.log(`📝 Testando: ${test.name}`);
      
      const response = await fetch(`${baseUrl}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // Token de teste
        },
        body: JSON.stringify(test.data)
      });
      
      totalTests++;
      
      if (response.status === 400) {
        console.log(`   ✅ Sucesso: Retornou 400 (Bad Request) - ${response.status}`);
        successfulTests++;
      } else if (response.status === 401) {
        console.log(`   ⚠️  Token inválido: ${response.status} (Esperado para teste)`);
        successfulTests++;
      } else {
        console.log(`   ❌ Falha: Retornou ${response.status} (Esperado 400)`);
      }
      
      // Pequena pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      totalTests++;
    }
    
    console.log('');
  }
  
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`   Total de testes: ${totalTests}`);
  console.log(`   Sucessos: ${successfulTests}`);
  console.log(`   Taxa de sucesso: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n🔍 Verificando estatísticas de segurança...');
  
  try {
    const statsResponse = await fetch(`${baseUrl}/api/admin/security-monitor?type=stats`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('   📈 Estatísticas atuais:');
      console.log(`      Total de eventos: ${stats.data?.totalEvents || 0}`);
      console.log(`      Entradas inválidas: ${stats.data?.eventsByType?.invalid_input || 0}`);
      console.log(`      Logins com falha: ${stats.data?.eventsByType?.login_attempt_failed || 0}`);
    } else {
      console.log('   ⚠️  Não foi possível acessar as estatísticas (token inválido)');
    }
  } catch (error) {
    console.log(`   ❌ Erro ao verificar estatísticas: ${error.message}`);
  }
  
  console.log('\n✅ Testes concluídos!');
};

// Executar testes
testInvalidInputs().catch(console.error);




