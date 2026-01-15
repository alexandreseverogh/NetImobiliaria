
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function listCategories() {
    try {
        const res = await pool.query('SELECT * FROM feed.feed_categorias ORDER BY id');
        console.log('CATEGORIAS ENCONTRADAS:');
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error('Erro ao listar categorias:', err);
        await pool.end();
    }
}

listCategories();
