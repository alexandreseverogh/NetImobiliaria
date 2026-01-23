const fs = require('fs');

try {
    let content = fs.readFileSync('api_response_recife.json');

    // Remove BOM if present (EF BB BF for UTF-8 or FF FE / FE FF for UTF-16)
    if (content[0] === 0xFF && content[1] === 0xFE) {
        content = content.slice(2); // Strip UTF-16 LE BOM
        content = content.toString('utf16le');
    } else if (content[0] === 0xFE && content[1] === 0xFF) {
        content = content.slice(2); // Strip UTF-16 BE BOM
        content = content.toString('utf16be');
    } else {
        content = content.toString('utf8'); // Assume UTF-8
    }

    // Find start of JSON
    const jsonStart = content.indexOf('{');
    if (jsonStart > -1) {
        content = content.substring(jsonStart);
    }

    const data = JSON.parse(content);

    if (data && data.imoveis) {
        console.log('Found imoveis:', data.imoveis.length);
        const targetIds = [155, 157, 145];
        data.imoveis.forEach(imovel => {
            if (targetIds.includes(imovel.id)) {
                console.log(`ID: ${imovel.id}, Lancamento: ${imovel.lancamento} (Type: ${typeof imovel.lancamento})`);
            }
        });
    }
} catch (err) {
    console.error(err);
}
