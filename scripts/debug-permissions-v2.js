const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually parse .env.local to avoid dotenv issues
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    connectionString: envConfig.DATABASE_URL,
});

const userId = 'c57ab897-c068-46a4-9b12-bb9f2d938fe7';

async function debug() {
    try {
        console.log(`🔍 Debugging permissions for User: ${userId}`);

        // 1. Check if user exists
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            console.log('❌ User NOT FOUND in database!');
        } else {
            const user = userRes.rows[0];
            console.log(`✅ User Found: ${user.email} (Active: ${user.ativo})`);
        }

        // 2. Check Permissions for status*
        console.log('\n🔍 Checking permissions for features starting with "status":');
        const permRes = await pool.query(`
      SELECT sf.slug, p.action 
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1 AND sf.slug LIKE 'status%'
    `, [userId]);

        if (permRes.rows.length === 0) {
            console.log('❌ No permissions found for "status*" features.');
        } else {
            console.table(permRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debug();
