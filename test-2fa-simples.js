// Teste simples do 2FA
// Usando fetch nativo do Node.js 18+

async function test2FA() {
  try {
    console.log('🔍 Testando 2FA...');
    
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const data = await response.json();
    console.log('📋 Resposta:', JSON.stringify(data, null, 2));
    
    if (data.requires2FA) {
      console.log('✅ 2FA detectado!');
    } else if (data.success) {
      console.log('⚠️ Login sem 2FA');
    } else {
      console.log('❌ Erro:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

test2FA();
