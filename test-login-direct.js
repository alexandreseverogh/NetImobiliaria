// Teste direto da API de login
const http = require('http');

function testLoginAPI() {
  console.log('🔍 TESTANDO API DE LOGIN DIRETAMENTE...\n');
  
  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📊 Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📊 Resposta completa:');
      try {
        const jsonData = JSON.parse(data);
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (res.statusCode === 200 && jsonData.success) {
          console.log('\n✅ LOGIN FUNCIONOU!');
          console.log(`🎯 Token: ${jsonData.token ? 'Gerado' : 'Não gerado'}`);
          console.log(`🎯 User ID: ${jsonData.user?.id || 'N/A'}`);
        } else {
          console.log('\n❌ LOGIN FALHOU!');
          console.log(`🎯 Erro: ${jsonData.message || jsonData.error || 'Desconhecido'}`);
        }
      } catch (error) {
        console.log('❌ Erro ao parsear JSON:', error.message);
        console.log('📄 Resposta raw:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testLoginAPI();

