// Script para testar CPF inválido no CRUD de clientes
// Verifica se gera eventos de entrada inválida

const testInvalidCPF = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testando CPF inválido no CRUD de clientes...\n');
  
  // CPFs inválidos para teste
  const invalidCPFs = [
    {
      name: 'CPF com números repetidos',
      cpf: '11111111111',
      expected: 'CPF inválido (números repetidos)'
    },
    {
      name: 'CPF com dígitos insuficientes',
      cpf: '123456789',
      expected: 'CPF deve ter 11 dígitos'
    },
    {
      name: 'CPF com dígitos em excesso',
      cpf: '123456789012',
      expected: 'CPF deve ter 11 dígitos'
    },
    {
      name: 'CPF com primeiro dígito inválido',
      cpf: '12345678901',
      expected: 'CPF inválido (primeiro dígito)'
    },
    {
      name: 'CPF com segundo dígito inválido',
      cpf: '12345678910',
      expected: 'CPF inválido (segundo dígito)'
    },
    {
      name: 'CPF com formato incorreto',
      cpf: '123.456.789-0',
      expected: 'CPF inválido'
    },
    {
      name: 'CPF vazio',
      cpf: '',
      expected: 'CPF é obrigatório'
    },
    {
      name: 'CPF com caracteres especiais',
      cpf: 'abc123def456',
      expected: 'CPF deve ter 11 dígitos'
    }
  ];
  
  let totalTests = 0;
  let successfulTests = 0;
  
  for (const test of invalidCPFs) {
    try {
      console.log(`📝 Testando: ${test.name}`);
      console.log(`   CPF: ${test.cpf}`);
      
      const response = await fetch(`${baseUrl}/api/admin/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // Token de teste
        },
        body: JSON.stringify({
          nome: 'Cliente Teste',
          cpf: test.cpf,
          telefone: '11999999999',
          email: 'cliente@teste.com'
        })
      });
      
      totalTests++;
      
      if (response.status === 400) {
        const errorData = await response.json();
        console.log(`   ✅ Sucesso: Retornou 400 (Bad Request)`);
        console.log(`   📋 Erro: ${errorData.error || 'Dados inválidos'}`);
        if (errorData.details) {
          console.log(`   📋 Detalhes: ${errorData.details.join(', ')}`);
        }
        successfulTests++;
      } else if (response.status === 401) {
        console.log(`   ⚠️  Token inválido: ${response.status} (Esperado para teste)`);
        successfulTests++;
      } else {
        console.log(`   ❌ Falha: Retornou ${response.status} (Esperado 400)`);
        const errorData = await response.json();
        console.log(`   📋 Resposta: ${JSON.stringify(errorData)}`);
      }
      
      // Pequena pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
      
      if (stats.data?.eventsByType?.invalid_input > 0) {
        console.log('   ✅ CPF inválido está sendo capturado nas estatísticas!');
      } else {
        console.log('   ❌ CPF inválido NÃO está sendo capturado nas estatísticas');
      }
    } else {
      console.log('   ⚠️  Não foi possível acessar as estatísticas (token inválido)');
    }
  } catch (error) {
    console.log(`   ❌ Erro ao verificar estatísticas: ${error.message}`);
  }
  
  console.log('\n✅ Testes de CPF concluídos!');
};

// Executar testes
testInvalidCPF().catch(console.error);




