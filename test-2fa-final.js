// Teste final do 2FA após criar tabelas
require('dotenv').config({ path: '.env.local' });

async function test2FAFinal() {
  try {
    console.log('🔍 Testando 2FA após criar tabelas...\n');

    // 1. Testar login com usuário que tem 2FA habilitado
    console.log('1. Fazendo login com usuário admin...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    console.log('📊 Status da resposta:', loginResponse.status);
    
    const loginData = await loginResponse.json();
    console.log('📋 Resposta do login:');
    console.log(JSON.stringify(loginData, null, 2));

    if (loginData.requires2FA) {
      console.log('\n✅ 2FA FUNCIONANDO! Código enviado por email.');
      console.log('📧 Verifique seu email para o código de verificação.');
      
      // 2. Simular teste com código (substitua pelo código real)
      console.log('\n2. Para testar com código 2FA:');
      console.log('   - Insira o código recebido por email');
      console.log('   - Ou execute: node test-2fa-with-code.js SEU_CODIGO_AQUI');
      
    } else if (loginData.success) {
      console.log('\n⚠️ Login sem 2FA - usuário pode não ter 2FA habilitado');
    } else {
      console.log('\n❌ Erro no login:', loginData.message);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

test2FAFinal();