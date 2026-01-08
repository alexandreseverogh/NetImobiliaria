
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function runMigrations() {
    try {
        const files = ['043_restore_corretor_areas.sql', '044_seed_corretor_areas.sql'];
        for (const file of files) {
            const sqlPath = path.join(__dirname, '..', 'database', 'migrations', file);
            const sql = fs.readFileSync(sqlPath, 'utf8');
            console.log(`🚀 Executando ${file}...`);
            await pool.query(sql);
            console.log(`✅ ${file} executado com sucesso!`);
        }
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        await pool.end();
    }
}

runMigrations();
