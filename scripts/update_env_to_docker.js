
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local não encontrado!');
    process.exit(1);
}

let content = fs.readFileSync(envPath, 'utf8');

// Atualizações
const updates = {
    DB_PORT: '15432',
    DB_PASSWORD: 'postgres', // Senha padrão do Docker Compose
    DB_HOST: 'localhost'      // Continua localhost (mapeado)
};

let lines = content.split('\n');
let newLines = [];
const keysFound = {};

lines.forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
        const key = match[1];
        if (updates[key] !== undefined) {
            newLines.push(`${key}=${updates[key]}`);
            keysFound[key] = true;
            console.log(`✅ Atualizado: ${key}=${updates[key]}`);
        } else {
            newLines.push(line);
        }
    } else {
        newLines.push(line);
    }
});

// Adicionar chaves faltantes
for (const [key, value] of Object.entries(updates)) {
    if (!keysFound[key]) {
        newLines.push(`${key}=${value}`);
        console.log(`✅ Adicionado: ${key}=${value}`);
    }
}

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('🎉 .env.local atualizado para usar o Banco Docker!');
