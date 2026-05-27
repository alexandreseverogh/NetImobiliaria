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

async function getFunctionSource() {
    try {
        const res = await pool.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'get_sidebar_menu_for_user'
        `);
        const source = res.rows[0].pg_get_functiondef;
        console.log('Source found.');
        if (source.includes('Master Governance')) {
            console.log('FOUND Master Governance in function source!');
        } else {
            console.log('NOT FOUND in function source.');
        }
        process.stdout.write(source);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

getFunctionSource();
