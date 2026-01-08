
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Docker DB
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function inspect() {
    try {
        console.log('🔍 Inspecionando tabela PARAMETROS no Docker (15432)...');

        const r = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parametros';
    `);

        console.log('Colunas encontradas:', r.rows.map(r => r.column_name));

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspect();
