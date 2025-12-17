const http = require('http');

console.log('🚨 TESTE URGENTE - PÁGINA DE LOGIN');
console.log('==================================\n');

function testLogin() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/admin/login',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          success: res.statusCode === 200,
          hasContent: data.length > 0,
          hasLoading: data.includes('Carregando'),
          hasForm: data.includes('form'),
          hasButton: data.includes('button'),
          contentLength: data.length
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTest() {
  try {
    console.log('🔍 Testando página de login...');
    const result = await testLogin();
    
    console.log(`📊 Status: ${result.statusCode}`);
    console.log(`✅ Sucesso: ${result.success ? 'SIM' : 'NÃO'}`);
    console.log(`📄 Tem conteúdo: ${result.hasContent ? 'SIM' : 'NÃO'}`);
    console.log(`🔄 Tem "Carregando": ${result.hasLoading ? 'SIM' : 'NÃO'}`);
    console.log(`📝 Tem formulário: ${result.hasForm ? 'SIM' : 'NÃO'}`);
    console.log(`🔘 Tem botão: ${result.hasButton ? 'SIM' : 'NÃO'}`);
    console.log(`📏 Tamanho: ${result.contentLength} bytes`);
    
    if (result.success && result.hasForm && !result.hasLoading) {
      console.log('\n🎉 SUCESSO: Página de login funcionando!');
    } else {
      console.log('\n❌ PROBLEMA: Página ainda com problemas');
    }
    
  } catch (error) {
    console.log(`\n❌ ERRO: ${error.message}`);
  }
}

runTest();




