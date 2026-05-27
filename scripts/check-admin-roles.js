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

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '15432'),
});

async function checkAdminRoles() {
    try {
        const res = await pool.query(`
            SELECT u.username, r.name as role_name, r.level as role_level, r.is_system_role
            FROM users u
            LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
            LEFT JOIN user_roles r ON ura.role_id = r.id
            WHERE u.username = 'admin'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAdminRoles();
