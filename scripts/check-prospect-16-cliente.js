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
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function checkProspect16() {
    try {
        const res = await pool.query('SELECT id, id_imovel, id_cliente FROM imovel_prospects WHERE id = 16');
        console.log('\n📋 Prospect 16:');
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkProspect16();
