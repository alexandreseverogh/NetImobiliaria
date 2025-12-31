const fs = require('fs');
const file = '/app/src/app/landpaging/page.tsx';

// Ler como Windows-1252
const buffer = fs.readFileSync(file);
let content = buffer.toString('latin1');

// Substituir TODOS os caracteres corrompidos
content = content
  .replace(/Im├│veis/g, 'Imóveis')
  .replace(/im├│veis/g, 'imóveis')
  .replace(/Im├│vel/g, 'Imóvel')  
  .replace(/im├│vel/g, 'imóvel')
  .replace(/t├¡tulo/g, 'título')
  .replace(/├¡/g, 'í')
  .replace(/├ú/g, 'ã')
  .replace(/├á/g, 'á')
  .replace(/├º/g, 'ç')
  .replace(/├®/g, 'é')
  .replace(/├¬/g, 'ê')
  .replace(/├´/g, 'ô')
  .replace(/├ü/g, 'Ú')
  .replace(/├ô/g, 'ú')
  .replace(/├│/g, 'ó');

// Escrever em UTF-8 SEM BOM
fs.writeFileSync(file, content, { encoding: 'utf8', flag: 'w' });

console.log('✅ Conversão completa!');

