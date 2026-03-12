const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost',
    database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function diagnose() {
    try {
        console.log('--- TODAS AS COLUNAS imoveis ---');
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'imoveis' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
diagnose();
