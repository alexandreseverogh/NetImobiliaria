// Teste direto da API 2FA
require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function test2FAAPI() {
  try {
    console.log('🔍 Testando 2FA na API...\n');

    // 1. Testar login com usuário que tem 2FA habilitado
    console.log('1. Testando login com 2FA...');
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
      console.log('\n✅ 2FA detectado! Código deve ter sido enviado por email.');
      
      // 2. Verificar se há códigos 2FA no banco
      console.log('\n2. Verificando códigos 2FA no banco...');
      
      // Simular verificação no banco (você pode executar o script de banco separadamente)
      console.log('   Execute: node test-2fa-database.js');
      
    } else if (loginData.success) {
      console.log('\n⚠️ Login bem-sucedido sem 2FA');
      console.log('   Verifique se o usuário tem two_fa_enabled = true');
    } else {
      console.log('\n❌ Erro no login:', loginData.message);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('\n💡 Dicas:');
    console.log('   - Verifique se o servidor está rodando (npm run dev)');
    console.log('   - Verifique se o usuário existe e tem two_fa_enabled = true');
    console.log('   - Execute: node test-2fa-database.js para verificar o banco');
  }
}

test2FAAPI();


