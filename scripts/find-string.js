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

async function findString(str) {
    try {
        const tables = ['sidebar_menu_items', 'system_features', 'system_modules', 'system_categories'];
        for (const table of tables) {
            console.log(`Checking table: ${table}`);
            const res = await pool.query(`SELECT * FROM ${table}`);
            const matches = res.rows.filter(row => JSON.stringify(row).includes(str));
            if (matches.length > 0) {
                console.log(`FOUND in ${table}:`);
                console.table(matches);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findString('Master Governance');
findString('Sistema');
