require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
};

console.log('Connection Config:', {
    user: poolConfig.user,
    host: poolConfig.host,
    database: poolConfig.database,
    port: poolConfig.port,
    password: poolConfig.password ? '******' : 'MISSING'
});

const pool = new Pool(poolConfig);

async function run() {
    try {
        console.log('Connecting...');
        const municipio = 'Recife';
        const corretorId = 'abd6b94a-fbe9-4a9b-8688-f3ecb142fff3';

        // 1. Check for cidade_fk column type
        console.log('\nChecking imoveis columns...');
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'imoveis'
            AND column_name IN ('cidade_fk', 'corretor_fk', 'estado_fk')
        `);
        console.table(cols.rows);

        // 2. Check if imoveis_completos view works at all
        console.log('\nChecking imoveis_completos view...');
        try {
            await pool.query('SELECT 1 FROM imoveis_completos LIMIT 1');
            console.log('View imoveis_completos is ACCESSIBLE.');
        } catch (e) {
            console.error('View imoveis_completos FAILED:', e.message);
        }

        console.log('\nRunning problematic query...');

        // The problematic query from imoveis.ts uses:
        // AND cidade_fk = 'Recife' (string) if that's what passed

        // Let's try to REPRODUCE the error first with the suspicious condition
        const query = `
          SELECT 
            ic.id, ic.codigo
          FROM imoveis_completos ic
          LEFT JOIN imoveis i ON ic.id = i.id
          LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid
          WHERE 1=1
          AND cidade_fk = $1
          AND i.corretor_fk = $2
          LIMIT 1
        `;

        const params = [municipio, corretorId];

        console.log('Query:', query);
        console.log('Params:', params);

        const res = await pool.query(query, params);
        console.log('Success! Found:', res.rows.length);

    } catch (err) {
        console.error('QUERY FAILED:', err.message);
        if (err.code) console.error('Code:', err.code);
    } finally {
        pool.end();
    }
}

run();
