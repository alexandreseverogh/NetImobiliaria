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

    // Pattern 1: (!decoded.role_level || decoded.role_level < 6)
    // Convert to: (!decoded.is_system_role)
    content = content.replace(/\(!decoded\.role_level || decoded\.role_level < 6\)/g, "(!decoded.is_system_role)");

    // Pattern 2: (roleLevel < 6)
    // Convert to: (!decoded.is_system_role)
    content = content.replace(/\(roleLevel < 6\)/g, "(!decoded.is_system_role)");

    // Pattern 3: (decoded as any).role_level < 6
    content = content.replace(/\(!\(decoded as any\)\.role_level || \(decoded as any\)\.role_level < 6\)/g, "(!(decoded as any).is_system_role)");

     // Pattern 4: Manual Level matches in code blocks
    content = content.replace(/role_level < 6/g, "!decoded.is_system_role");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Semantic Fix:', filePath);
      changed++;
    }
  });

  console.log('Total semantic fixes:', changed);
}

processFiles();
