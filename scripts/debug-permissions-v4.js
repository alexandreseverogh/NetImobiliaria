const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const poolConfig = {
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
};

const pool = new Pool(poolConfig);

async function debug() {
    try {
        console.log(`\n🔍 Debugging Role Permissions for Role ID: 3 (Corretor)`);

        const res = await pool.query(`
      SELECT rp.role_id, p.id as perm_id, p.action, sf.slug 
      FROM role_permissions rp 
      JOIN permissions p ON rp.permission_id = p.id 
      JOIN system_features sf ON p.feature_id = sf.id 
      WHERE rp.role_id = 3 AND sf.slug LIKE 'status%'
    `);

        if (res.rows.length === 0) {
            console.log('❌ No permissions found for "status*" features for Role 3!');
        } else {
            console.table(res.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debug();
