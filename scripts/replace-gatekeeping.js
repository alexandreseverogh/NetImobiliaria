const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFiles() {
  const masterDir = path.join('C:\\', 'NetImobiliária', 'net-imobiliaria', 'src', 'app', 'api', 'admin', 'master');
  let changed = 0;
  walkDir(masterDir, (filePath) => {
    if (!filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Pattern 1: decoded.role_name !== 'Super Admin'
    // Convert to: (!decoded.role_level || decoded.role_level < 6)
    content = content.replace(/decoded\.role_name !== 'Super Admin'/g, "(!decoded.role_level || decoded.role_level < 6)");

    // Pattern 2: (decoded as any).role_name !== 'Super Admin'
    content = content.replace(/\(decoded as any\)\.role_name !== 'Super Admin'/g, "(!(decoded as any).role_level || (decoded as any).role_level < 6)");

    // Pattern 3: decodedAny.role_name !== 'Super Admin' && decodedAny.role_level < 6
    // Which might look like: (decodedAny.role_name !== 'Super Admin' && decodedAny.role_level < 6)
    content = content.replace(/\(decodedAny\.role_name !== 'Super Admin' && decodedAny\.role_level < 6\)/g, "(!decodedAny.role_level || decodedAny.role_level < 6)");

    // Sometimes we might have something like `if (!decoded || (!decoded.role_level || decoded.role_level < 6))`
    // Which is logically fine, if slightly redundant `if (!decoded || !decoded.role_level...)`

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed:', filePath);
      changed++;
    }
  });

  console.log('Total files fixed:', changed);
}

processFiles();
