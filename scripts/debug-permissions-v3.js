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

console.log('DB Config:', { ...poolConfig, password: '***' });

const pool = new Pool(poolConfig);
const userId = 'c57ab897-c068-46a4-9b12-bb9f2d938fe7';

async function debug() {
    try {
        console.log(`\n🔍 Debugging for User: ${userId}`);

        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            console.log('❌ User NOT FOUND!');
        } else {
            console.log(`✅ User Found: ${userRes.rows[0].email} (Ativo: ${userRes.rows[0].ativo})`);
        }

        // 2. Check Role
        const roleRes = await pool.query(`
      SELECT ur.name, ur.id 
      FROM user_role_assignments ura 
      JOIN user_roles ur ON ura.role_id = ur.id 
      WHERE ura.user_id = $1
    `, [userId]);

        if (roleRes.rows.length === 0) {
            console.log('❌ User has NO ROLE!');
        } else {
            console.log(`✅ User Role: ${roleRes.rows[0].name} (ID: ${roleRes.rows[0].id})`);
        }

        console.log('\n🔍 Permissions for status*:');
        const permRes = await pool.query(`
      SELECT sf.slug, p.action 
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1 AND sf.slug LIKE 'status%'
    `, [userId]);

        console.table(permRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debug();
