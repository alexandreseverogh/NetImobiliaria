
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function inspectFull() {
    try {
        console.log('🔍 Inspecionando colunas da tabela PARAMETROS no Docker (15432)...');

        // Método infalível: Consultar information_schema
        const r = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'parametros'
      ORDER BY ordinal_position;
    `);

        if (r.rows.length === 0) {
            console.log("❌ Tabela 'parametros' não encontrada ou sem colunas.");
        } else {
            console.table(r.rows.map(row => ({
                Column: row.column_name,
                Type: row.data_type
            })));
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectFull();
