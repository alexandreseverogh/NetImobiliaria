const fs = require('fs');

try {
    const filePath = 'c:\\NetImobiliária\\net-imobiliaria\\errors.log';
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('utf16le');
    const lines = content.split('\n');
    console.log('--- ÚLTIMAS 50 LINHAS DO LOG ---');
    console.log(lines.slice(-50).join('\n'));
} catch (err) {
    console.error('Erro ao ler log:', err);
}
