const http = require('http');

console.log('🔍 VERIFICANDO STATUS DO SERVIDOR');
console.log('=================================\n');

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          name,
          statusCode: res.statusCode,
          success: res.statusCode === 200,
          hasContent: data.length > 0,
          hasError: data.includes('Error:') || data.includes('error') || data.includes('Carregando...'),
          contentLength: data.length
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name,
        statusCode: 0,
        success: false,
        hasContent: false,
        hasError: true,
        error: err.message,
        contentLength: 0
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        statusCode: 0,
        success: false,
        hasContent: false,
        hasError: true,
        error: 'Timeout',
        contentLength: 0
      });
    });

    req.end();
  });
}

async function runDiagnosis() {
  console.log('🧪 Testando endpoints...\n');
  
  const endpoints = [
    { path: '/', name: 'Home' },
    { path: '/admin/login', name: 'Admin Login' },
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/api/admin/auth/session-info', name: 'Session Info API' }
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path, endpoint.name);
    
    console.log(`📊 ${result.name}:`);
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Sucesso: ${result.success ? '✅' : '❌'}`);
    console.log(`   Conteúdo: ${result.contentLength} bytes`);
    console.log(`   Erro: ${result.hasError ? '❌ SIM' : '✅ NÃO'}`);
    if (result.error) {
      console.log(`   Detalhes: ${result.error}`);
    }
    console.log('');
  }

  console.log('🔍 DIAGNÓSTICO COMPLETO');
  console.log('=======================');
}

runDiagnosis();




