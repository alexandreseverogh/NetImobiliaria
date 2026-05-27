const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\b6fb4d36-455d-4c9e-8125-49fca0d255bc';
const destDir = path.join(__dirname, 'public', 'assets', 'artemis');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('Created directory:', destDir);
}

const assets = [
  { src: 'adm_provisionado_1779556833706.png', dest: 'adm-provisionado.png' },
  { src: 'crm_module_1779556852395.png', dest: 'crm.png' },
  { src: 'cadastros_module_1779556869978.png', dest: 'cadastros.png' },
  { src: 'campanhas_module_1779556888238.png', dest: 'gestao-campanhas.png' },
  { src: 'imobiliario_module_1779556906889.png', dest: 'imobiliario.png' },
  { src: 'saude_module_1779556924341.png', dest: 'saude.png' },
  { src: 'master_module_1779556945852.png', dest: 'master-platform.png' }
];

assets.forEach(asset => {
  const srcPath = path.join(srcDir, asset.src);
  const destPath = path.join(destDir, asset.dest);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${asset.src} to ${asset.dest}`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
});

console.log('Asset copying completed successfully!');
