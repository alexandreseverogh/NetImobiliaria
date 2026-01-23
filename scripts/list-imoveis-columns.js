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
    user: envConfig.POSTGRES_USER || 'postgres',
    host: envConfig.POSTGRES_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: envConfig.POSTGRES_PASSWORD || 'Roberto@2007',
    port: parseInt(envConfig.POSTGRES_PORT || '5432'),
});

async function listColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'imoveis'
            ORDER BY column_name;
        `);
        console.log('Columns in imoveis table:');
        res.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listColumns();
