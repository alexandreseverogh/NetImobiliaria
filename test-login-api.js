// Teste da API de login para identificar o problema
// Usando fetch nativo do Node.js (versão 18+)

async function testLogin() {
  console.log('🔍 TESTANDO API DE LOGIN...');
  
  try {
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
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('📊 Resposta:', result);
    
    if (response.status === 200) {
      console.log('✅ LOGIN FUNCIONOU!');
    } else {
      console.log('❌ LOGIN FALHOU!');
    }
    
  } catch (error) {
    console.error('❌ ERRO NA REQUISIÇÃO:', error.message);
  }
}

testLogin();
