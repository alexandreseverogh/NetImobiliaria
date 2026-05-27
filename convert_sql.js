const fs = require('fs');
const content = fs.readFileSync('src/scripts/fn_def.sql', 'utf16le');
fs.writeFileSync('fn_def_readable.txt', content, 'utf8');
console.log('Convertido!');
