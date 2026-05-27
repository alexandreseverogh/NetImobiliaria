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

async function getUsers() {
    try {
        const res = await pool.query("SELECT * FROM public.users LIMIT 1");
        console.log('Columns in public.users:');
        console.log(Object.keys(res.rows[0]));
        
        const adminRes = await pool.query("SELECT * FROM public.users WHERE username = 'admin' OR email = 'admin'");
        console.log('Admin user data:');
        console.table(adminRes.rows.map(r => ({ ...r, password: '***', senha: '***' })));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

getUsers();
