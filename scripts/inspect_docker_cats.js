
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

async function inspectDockerCats() {
    try {
        console.log('📂 Categorias (Docker):');
        const r = await pool.query("SELECT * FROM system_categorias ORDER BY order_index");
        console.table(r.rows);

        console.log('⚙️ Feature Parametros (Docker):');
        const f = await pool.query("SELECT id, name, category_id, slug FROM system_features WHERE slug = 'parametros'");
        console.table(f.rows);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectDockerCats();
