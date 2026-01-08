
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

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '040_fix_duplicates_order.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Executando migração 040 (Fix Duplicates/Order) no Docker (15432)...');
        await pool.query(sql);
        console.log('✅ Migração 040 executada com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
