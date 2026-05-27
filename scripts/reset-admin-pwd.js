const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

async function resetPassword() {
    try {
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash('admin', salt);
        
        await pool.query("UPDATE public.users SET password = $1 WHERE username = 'admin'", [hash]);
        console.log('Password for user admin reset to "admin" with proper bcrypt hash.');
        console.log('New hash:', hash);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

resetPassword();
