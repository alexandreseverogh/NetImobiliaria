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
        console.log('Iniciando migração de timezone...');

        // 1. Alterar created_at para TIMESTAMP WITH TIME ZONE
        // O 'USING created_at AT TIME ZONE \'UTC\'' pega o valor atual (ex: 19:00 "seco") e diz que ele é UTC (19:00+00)
        await pool.query(`
      ALTER TABLE imovel_prospects 
      ALTER COLUMN created_at 
      TYPE timestamp with time zone 
      USING created_at AT TIME ZONE 'UTC';
    `);

        console.log('✅ Coluna created_at convertida com sucesso.');

        // Verificar resultado
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imovel_prospects' 
      AND column_name = 'created_at'
    `);
        console.log('Novo tipo:', res.rows[0]);

    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        pool.end();
    }
}

main();
