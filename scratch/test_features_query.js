const { Client } = require('pg');

async function testQuery() {
    const client = new Client({
        host: '127.0.0.1',
        port: 15432,
        user: 'postgres',
        password: 'postgres',
        database: 'net_imobiliaria'
    });
    try {
        await client.connect();
        const featuresQuery = `
          SELECT 
            sf.*, 
            sc.name as category_name,
            COALESCE(array_agg(sm.id) FILTER (WHERE sm.id IS NOT NULL), '{}') as module_ids,
            COALESCE(string_agg(sm.name, ', ') FILTER (WHERE sm.name IS NOT NULL), '') as module_names
          FROM system_features sf
          LEFT JOIN system_categorias sc ON sf.category_id = sc.id
          LEFT JOIN system_feature_modules sfm ON sf.id = sfm.feature_id
          LEFT JOIN system_modules sm ON sfm.module_id = sm.id
          WHERE sf.is_active = true OR sf.is_active = false
          GROUP BY sf.id, sc.name
          ORDER BY sc.sort_order ASC, sc.name ASC, sf.sort_order ASC, sf.name ASC
        `;
        const res = await client.query(featuresQuery);
        console.log('Total features:', res.rowCount);
        if (res.rowCount > 0) {
            console.log('Sample feature:', res.rows[0]);
        }
    } catch (err) {
        console.error('Erro na query:', err);
    } finally {
        await client.end();
    }
}

testQuery();
