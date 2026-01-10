// Simular o que o cron deveria fazer: chamar routeProspectAndNotify
const http = require('http');

async function testRouting() {
    console.log('\n🧪 Testando roteamento manual do Prospect 16...\n');

    // Chamar a API de roteamento diretamente
    const postData = JSON.stringify({
        prospectId: 16,
        excludeIds: ['43b2242a-cbea-4696-9e29-3987211188a3'], // ID do corretor que já recebeu
        forceFallback: false
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/prospects/route',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('📊 Resposta:');
            console.log(data);
        });
    });

    req.on('error', (e) => {
        console.error('❌ Erro:', e.message);
    });

    req.write(postData);
    req.end();
}

testRouting();
