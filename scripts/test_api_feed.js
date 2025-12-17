require('dotenv').config({ path: '.env.local' });
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/public/feed',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🧪 Testando API /api/public/feed...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    try {
      const json = JSON.parse(data);
      console.log('\n✅ Resposta JSON:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success && json.data) {
        console.log(`\n✅ Total de posts: ${json.data.length}`);
        if (json.data.length > 0) {
          console.log('\n📰 Primeiro post:');
          console.log(`   Título: ${json.data[0].titulo}`);
          console.log(`   Fonte: ${json.data[0].fonte_nome}`);
          console.log(`   Categoria: ${json.data[0].categoria_nome}`);
        }
      }
    } catch (e) {
      console.log('\n❌ Erro ao parsear JSON:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
  console.error('\n⚠️ Certifique-se de que o servidor Next.js está rodando (npm run dev)');
});

req.end();

