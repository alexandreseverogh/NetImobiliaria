const http = require('http');

console.log('🧪 TESTE MÍNIMO - MONITORAMENTO DE SEGURANÇA');
console.log('============================================\n');

function testPage() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/admin/security-monitor',
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
          hasError: data.includes('Error:') || data.includes('error')
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
    console.log('🔍 Testando página de monitoramento...');
    const result = await testPage();
    
    console.log(`📊 Status: ${result.statusCode}`);
    console.log(`✅ Sucesso: ${result.success ? 'SIM' : 'NÃO'}`);
    console.log(`📄 Tem conteúdo: ${result.hasContent ? 'SIM' : 'NÃO'}`);
    console.log(`❌ Tem erro: ${result.hasError ? 'SIM' : 'NÃO'}`);
    
    if (result.success && !result.hasError) {
      console.log('\n🎉 SUCESSO: Página funcionando corretamente!');
    } else {
      console.log('\n⚠️  PROBLEMA: Página com erro ou inacessível');
    }
    
  } catch (error) {
    console.log(`\n❌ ERRO: ${error.message}`);
  }
}

runTest();




