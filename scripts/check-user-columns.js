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

async function checkColumns() {
    try {
        console.log('--- Colunas da tabela USERS ---');
        const resUsers = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.table(resUsers.rows);

        console.log('--- Colunas da tabela USER_2FA_CONFIG ---');
        const res2FA = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_2fa_config'
        `);
        console.table(res2FA.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkColumns();
