const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../database/migrations/002_mv_cidades_ativas.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executando migration...');
        await pool.query(sql);
        console.log('✅ Migration executada com sucesso!');

        // Verificar se a view foi criada e tem dados
        const result = await pool.query('SELECT COUNT(*) FROM mv_cidades_ativas');
        console.log(`📊 Total de locais ativos na view: ${result.rows[0].count}`);

        await pool.end();
    } catch (err) {
        console.error('❌ Erro ao executar migration:', err);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
