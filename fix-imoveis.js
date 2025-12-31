const fs = require('fs');
const file = '/app/src/app/landpaging/page.tsx';

// Ler como Windows-1252
const buffer = fs.readFileSync(file);
let content = buffer.toString('latin1');

// Substituir APENAS "Im├│veis" por "Imóveis" em todas as variações
content = content.replace(/Im├│veis/g, 'Imóveis');
content = content.replace(/im├│veis/g, 'imóveis');
content = content.replace(/Im├│vel/g, 'Imóvel');
content = content.replace(/im├│vel/g, 'imóvel');

// Escrever em UTF-8 SEM BOM
fs.writeFileSync(file, content, { encoding: 'utf8', flag: 'w' });

console.log('✅ Correção aplicada!');

