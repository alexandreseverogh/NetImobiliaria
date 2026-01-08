
const http = require('http');

http.get('http://localhost:3000/api/public/imoveis/pesquisa?limit=1', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data && json.data.length > 0) {
                console.log('✅ Found Property:', json.data[0].codigo);
                console.log('🖼️  Image Field:', json.data[0].imagem_principal);

                if (json.data[0].imagem_principal && json.data[0].imagem_principal.includes('/api/public/imagens/')) {
                    console.log('🎉 SUCCESS: Image is a Streaming URL!');
                } else if (json.data[0].imagem_principal && json.data[0].imagem_principal.startsWith('data:')) {
                    console.log('❌ FAIL: Image is still Base64!');
                } else {
                    console.log('⚠️  WARNING: Image field is null or unknown format.');
                }
            } else {
                console.log('⚠️  No properties found to check.');
            }
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
});
