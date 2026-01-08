
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

async function inspectFeatures() {
    try {
        const r = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'system_features';
    `);
        console.log('Columns:', r.rows.map(c => c.column_name));

        // Sample
        const s = await pool.query('SELECT * FROM system_features LIMIT 1');
        if (s.rows.length > 0) console.log('Sample:', s.rows[0]);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectFeatures();
