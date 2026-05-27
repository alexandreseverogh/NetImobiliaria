const fetch = require('node-fetch');

async function testApi() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/master/features', {
            headers: {
                // We don't have the cookie here, so it might fail with 403
                // But we can see if it crashes with 500
            }
        });
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', JSON.stringify(data, null, 2).substring(0, 500));
    } catch (err) {
        console.error('Erro ao chamar API:', err);
    }
}

testApi();
