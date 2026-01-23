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
        const imovel152 = data.imoveis.find(i => i.id === 152);
        if (imovel152) {
            console.log(`ID: ${imovel152.id}, Title: ${imovel152.titulo}, Lancamento: ${imovel152.lancamento} (Type: ${typeof imovel152.lancamento})`);
        } else {
            console.log('ID 152 not found');
        }

        const imovel157 = data.imoveis.find(i => i.id === 157);
        if (imovel157) {
            console.log(`ID: ${imovel157.id}, Title: ${imovel157.titulo}, Lancamento: ${imovel157.lancamento}`);
        } else {
            console.log('ID 157 not found in Recife response');
        }

        console.log('All IDs found:', data.imoveis.map(i => i.id));
    }
} catch (err) {
    console.error(err);
}
