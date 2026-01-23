const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

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
    user: envConfig.DB_USER || 'postgres',
    host: envConfig.DB_HOST || 'localhost',
    database: envConfig.DB_NAME || 'net_imobiliaria',
    password: envConfig.DB_PASSWORD || 'postgres',
    port: parseInt(envConfig.DB_PORT || '15432'),
});

async function checkLancamento() {
    try {
        console.log(`Connecting to ${envConfig.DB_HOST}:${envConfig.DB_PORT} DB=${envConfig.DB_NAME}...`);
        const res = await pool.query('SELECT id, titulo, lancamento FROM imoveis WHERE id IN (155, 157)');
        console.log('Results:', res.rows);
        res.rows.forEach(row => {
            console.log(`ID: ${row.id}, Lancamento Type: ${typeof row.lancamento}, Value: ${row.lancamento}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkLancamento();
