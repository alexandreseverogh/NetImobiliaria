const fs = require('fs');
const file = '/app/src/app/landpaging/page.tsx';

// Ler como Windows-1252 (latin1)
let content = fs.readFileSync(file, 'latin1');

// Corrigir todos os caracteres
content = content
  .replace(/Im├│veis/g, 'Imóveis')
  .replace(/im├│veis/g, 'imóveis')
  .replace(/Im├│vel/g, 'Imóvel')
  .replace(/im├│vel/g, 'imóvel')
  .replace(/├¡/g, 'í')
  .replace(/├ú/g, 'ã')
  .replace(/├á/g, 'á')
  .replace(/├º/g, 'ç')
  .replace(/├®/g, 'é')
  .replace(/├¬/g, 'ê')
  .replace(/├´/g, 'ô')
  .replace(/├ü/g, 'Ú')
  .replace(/├ô/g, 'ú');

// Salvar como UTF-8
fs.writeFileSync(file, content, 'utf8');
console.log('✅ Encoding corrigido!');

