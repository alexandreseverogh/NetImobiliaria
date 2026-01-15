const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function main() {
    try {
        console.log('Atualizando schema da tabela financiadores...');

        // Adicionar colunas faltantes se não existirem
        await pool.query(`
      ALTER TABLE financiadores 
      ADD COLUMN IF NOT EXISTS headline text,
      ADD COLUMN IF NOT EXISTS logo_base64 text,
      ADD COLUMN IF NOT EXISTS logo_tipo_mime varchar(50),
      ADD COLUMN IF NOT EXISTS valor_mensal numeric(12,2) DEFAULT 0;
    `);

        console.log('✅ Colunas adicionadas com sucesso.');

    } catch (err) {
        console.error('❌ Erro na migração de financiadores:', err);
    } finally {
        pool.end();
    }
}

main();
