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

async function checkAdminUser() {
    try {
        const res = await pool.query('SELECT id, username, password_hash, is_active FROM public.users WHERE username = \'admin\'');
        console.log('User admin check:');
        console.table(res.rows);
        
        if (res.rows.length === 0) {
            console.log('User admin NOT FOUND in public.users. Checking by email...');
            const res2 = await pool.query('SELECT id, username, email, is_active FROM public.users WHERE email = \'admin\'');
            console.table(res2.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAdminUser();
