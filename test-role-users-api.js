// Script para testar a API de usuários por perfil
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function testRoleUsersAPI() {
  console.log('🔍 Testando API de usuários por perfil...\n');

  try {
    // 1. Fazer login para obter token
    console.log('1. Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login realizado com sucesso');

    // 2. Extrair token
    const token = loginData.data.token;
    console.log('🔑 Token obtido:', token ? 'Sim' : 'Não');

    // 3. Testar API de usuários por perfil
    console.log('\n2. Testando API de usuários por perfil...');
    
    // Testar com perfil ID 22 (Gerente 2FA Teste)
    const roleId = 22;
    console.log(`📋 Testando perfil ID: ${roleId}`);

    const usersResponse = await fetch(`${BASE_URL}/api/admin/roles/${roleId}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status da resposta:', usersResponse.status);

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ API funcionando!');
      console.log('📋 Dados retornados:', JSON.stringify(usersData, null, 2));
    } else {
      const errorData = await usersResponse.json();
      console.log('❌ Erro na API:', errorData);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testRoleUsersAPI();


