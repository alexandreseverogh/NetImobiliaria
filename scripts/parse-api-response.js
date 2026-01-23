const fs = require('fs');
const path = require('path');

try {
    const content = fs.readFileSync('api_response.json', 'utf16le'); // PowerShell outputs utf16le by default often with >
    // If utf16le fails we try utf8
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        const contentUtf8 = fs.readFileSync('api_response.json', 'utf8');
        data = JSON.parse(contentUtf8);
    }

    if (data && data.imoveis) {
        console.log('Found imoveis:', data.imoveis.length);
        const targetIds = [155, 157, 145];
        data.imoveis.forEach(imovel => {
            if (targetIds.includes(imovel.id)) {
                console.log(`ID: ${imovel.id}, Lancamento: ${imovel.lancamento} (Type: ${typeof imovel.lancamento})`);
            }
        });
    } else {
        console.log('No imoveis found or invalid structure');
    }
} catch (err) {
    console.error(err);
}
