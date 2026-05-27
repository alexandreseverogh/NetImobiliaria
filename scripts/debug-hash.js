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

async function checkHash() {
    try {
        const res = await pool.query("SELECT password FROM public.users WHERE username = 'admin'");
        if (res.rows.length > 0) {
            const { password } = res.rows[0];
            console.log('Password hash in DB:', password);
            
            const isBcrypt = password && password.startsWith('$2');
            console.log('Is valid bcrypt hash?', isBcrypt);
            
            // Teste com a senha 'admin' (se for o caso)
            if (isBcrypt) {
                const match = await bcrypt.compare('admin', password);
                console.log('Does "admin" match the hash?', match);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkHash();
