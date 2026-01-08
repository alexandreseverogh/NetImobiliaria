
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '032_restore_sidebar_parametros.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Executando migração 032 (Sidebar) no Docker (15432)...');
        await pool.query(sql);
        console.log('✅ Migração 032 executada com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
