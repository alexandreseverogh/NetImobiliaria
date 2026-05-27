const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const adminPath = 'c:/NetImobiliária/net-imobiliaria/src/app/admin';
  const folders = fs.readdirSync(adminPath).filter(f => fs.statSync(path.join(adminPath, f)).isDirectory());
  
  const res = await pool.query("SELECT name, url FROM system_features WHERE url LIKE '/admin/%'");
  const features = res.rows;
  
  console.log('--- Discrepancies Found ---');
  for (const feature of features) {
    const urlParts = feature.url.split('/');
    const folderName = urlParts[2];
    if (folderName && !folderName.startsWith('[') && !folders.includes(folderName)) {
      console.log(`❌ Feature "${feature.name}" URL "${feature.url}" has no folder "${folderName}"`);
    }
  }
  
  console.log('\n--- Folders with no matching feature ---');
  const featureUrls = features.map(f => f.url);
  for (const folder of folders) {
    if (!featureUrls.includes(`/admin/${folder}`)) {
      // Check if it's a subroute
      const hasPartialMatch = featureUrls.some(u => u.startsWith(`/admin/${folder}/`));
      if (!hasPartialMatch) {
        console.log(`⚠️ Folder "${folder}" has no exact feature URL match`);
      }
    }
  }
  
  await pool.end();
}

check();
