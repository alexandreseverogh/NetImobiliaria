const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function check() {
    try {
        const res = await pool.query(`
            SELECT u.id, u.nome, u.is_plantonista, u.ativo, ur.name as role_name
            FROM users u
            LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
            LEFT JOIN user_roles ur ON ura.role_id = ur.id
            WHERE u.is_plantonista = true OR u.nome ILIKE '%Plantonista%'
        `);
        console.log('ID | NOME | PLANTONISTA | ATIVO | ROLE');
        res.rows.forEach(r => {
            console.log(`${r.id} | ${r.nome} | ${r.is_plantonista} | ${r.ativo} | ${r.role_name}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
