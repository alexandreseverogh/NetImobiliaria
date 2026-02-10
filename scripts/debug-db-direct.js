
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const result = dotenv.config();
if (result.error) {
    console.log('Error loading .env:', result.error);
    dotenv.config({ path: '.env.local' });
}

console.log('CWD:', process.cwd());
console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE') || k.includes('POSTGRES')));

console.log('Using individual DB env vars...');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
    try {
        const targetUuid = 'b441fa86-ed4e-4621-9b4b-eb7467efa6c1';
        console.log('--- DEBUG START ---');
        console.log('Target UUID from URL:', targetUuid);

        // 1. Check if properties exist for this UUID
        const res = await pool.query('SELECT id, codigo, proprietario_uuid FROM imoveis WHERE proprietario_uuid = $1', [targetUuid]);
        console.log(`\n[Query 1] Properties count with EXACT UUID match: ${res.rowCount}`);
        if (res.rowCount > 0) {
            console.log('Sample matching properties:', res.rows.slice(0, 3));
        } else {
            console.log('No properties found for this UUID. This explains why the list SHOULD be empty if filtering works.');
            console.log('If the list shows items, then filtering is NOT working.');
        }

        // 2. Check first 5 properties in table to see what UUIDs they have
        const all = await pool.query(`
        SELECT 
            i.id, 
            i.codigo, 
            i.proprietario_uuid, 
            p.nome as proprietario_nome 
        FROM imoveis i 
        LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid 
        ORDER BY i.created_at DESC 
        LIMIT 5
    `);

        console.log('\n[Query 2] Recent 5 properties in DB (checking for data presence):');
        all.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Code: ${r.codigo}, OwnerUUID: ${r.proprietario_uuid}, Name: ${r.proprietario_nome}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

run();
