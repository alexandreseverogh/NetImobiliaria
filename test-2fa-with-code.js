// Script para testar 2FA com código
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function test2FAWithCode() {
  console.log('🔍 Testando 2FA com código...\n');

  try {
    // Substitua '123456' pelo código real que você recebeu por email
    const twoFactorCode = '123456'; // ⚠️ ALTERE PARA O CÓDIGO REAL!
    
    console.log('1. Fazendo login com código 2FA...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        twoFactorCode: twoFactorCode
      })
    });

    console.log('📊 Status da resposta:', loginResponse.status);

    const loginData = await loginResponse.json();
    console.log('📋 Resposta do login:', JSON.stringify(loginData, null, 2));

    if (loginData.success) {
      console.log('✅ Login com 2FA bem-sucedido!');
      console.log('🔑 Token obtido:', loginData.data.token ? 'Sim' : 'Não');
    } else {
      console.log('❌ Erro no login com 2FA:', loginData.message);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Verificar se código foi fornecido
if (process.argv[2]) {
  console.log('🔐 Usando código fornecido:', process.argv[2]);
  test2FAWithCode();
} else {
  console.log('⚠️ Para usar este script:');
  console.log('   node test-2fa-with-code.js SEU_CODIGO_AQUI');
  console.log('\nOu edite o arquivo e altere a variável twoFactorCode');
}


