
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 15432,
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
    const migrationPath = path.join(__dirname, '../database/migrations/050_add_hash_arquivo_imovel_imagens.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log('🚀 Iniciando migração 050 no banco de dados...');
        console.log(`Conectando ao banco: ${process.env.DB_NAME} em ${process.env.DB_HOST}`);

        await pool.query(sql);

        console.log('✅ Migração 050 (hash_arquivo em imovel_imagens) concluída com sucesso!');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao executar migração 050:', err.message);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
