
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Local DB (5432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'Roberto@2007',
    port: 5432,
});

async function inspect() {
    try {
        console.log('🔍 Inspecionando tabela PARAMETROS no Local (5432)...');

        const r = await pool.query('SELECT * FROM parametros LIMIT 1');
        if (r.rows.length > 0) {
            console.log('Row headers:', Object.keys(r.rows[0]));
        } else {
            console.log('Tabela vazia.');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspect();
