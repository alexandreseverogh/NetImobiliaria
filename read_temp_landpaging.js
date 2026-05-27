const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'temp-landpaging.html');
  const outPath = path.join(__dirname, 'temp-landpaging-utf8.html');
  
  // Read in UTF-16LE (often used by Windows PowerShell redirect)
  const content = fs.readFileSync(filePath, 'utf16le');
  
  // Write in UTF-8
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('✅ File converted to UTF-8 successfully!');
  console.log('Size in chars:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));
} catch (err) {
  console.error('Error:', err);
}
