
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '028_add_tipo_corretor_to_users.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executando migração 028...');
        await pool.query(sql);
        console.log('✅ Migração 028 executada com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
