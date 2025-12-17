// Script para debug do token de autenticação
console.log('🔍 DEBUG: Verificando token de autenticação...\n');

// Simular o que acontece no frontend
console.log('1️⃣ Verificando localStorage:');
if (typeof localStorage !== 'undefined') {
  const token = localStorage.getItem('auth-token');
  const userData = localStorage.getItem('user-data');
  
  console.log(`Token encontrado: ${token ? 'SIM' : 'NÃO'}`);
  console.log(`User data encontrado: ${userData ? 'SIM' : 'NÃO'}`);
  
  if (token) {
    console.log(`Token (primeiros 50 chars): ${token.substring(0, 50)}...`);
  }
  
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      console.log(`User data:`, parsed);
    } catch (e) {
      console.log(`Erro ao parsear user data: ${e.message}`);
    }
  }
} else {
  console.log('localStorage não disponível (ambiente servidor)');
}

console.log('\n2️⃣ Verificando cookies:');
if (typeof document !== 'undefined') {
  const cookies = document.cookie.split(';');
  const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
  
  console.log(`Cookie accessToken encontrado: ${accessTokenCookie ? 'SIM' : 'NÃO'}`);
  if (accessTokenCookie) {
    console.log(`Cookie: ${accessTokenCookie}`);
  }
} else {
  console.log('document não disponível (ambiente servidor)');
}

console.log('\n3️⃣ Simulando requisição com token:');
const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth-token') : null;

if (token) {
  console.log('✅ Token disponível, simulando header Authorization:');
  console.log(`Authorization: Bearer ${token.substring(0, 20)}...`);
  
  // Simular fetch
  fetch('/api/admin/categorias?include_features=true', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log(`\n4️⃣ Resposta da API:`);
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('❌ ERRO 401: Token de autenticação não fornecido ou inválido');
    } else if (response.status === 200) {
      console.log('✅ SUCESSO: API respondeu corretamente');
    }
    
    return response.text();
  })
  .then(data => {
    try {
      const parsed = JSON.parse(data);
      console.log('Dados da resposta:', parsed);
    } catch (e) {
      console.log('Resposta (texto):', data.substring(0, 200));
    }
  })
  .catch(error => {
    console.log('❌ Erro na requisição:', error.message);
  });
} else {
  console.log('❌ Nenhum token encontrado - usuário não está logado');
  console.log('SOLUÇÃO: Faça login novamente');
}

console.log('\n🎯 CONCLUSÃO:');
console.log('- Se token existe mas API retorna 401: problema no middleware');
console.log('- Se token não existe: problema no login ou armazenamento');
console.log('- Se tudo OK mas ainda falha: verificar console do navegador');
