const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkFeedCategories() {
    try {
        console.log('=== CATEGORIAS DE FEED (Container DB - Port 15432) ===\n');

        // Check all categories
        const allCats = await pool.query(`
      SELECT id, nome, slug, ativo, ordem
      FROM feed.feed_categorias
      ORDER BY ordem ASC NULLS LAST, nome ASC
    `);

        console.log('Total de categorias:', allCats.rowCount);
        console.table(allCats.rows);

        // Check active categories with feeds
        const activeCats = await pool.query(`
      SELECT 
        cat.id,
        cat.nome,
        cat.slug,
        cat.ativo,
        COUNT(c.id) as total_feeds
      FROM feed.feed_categorias cat
      LEFT JOIN feed.feed_conteudos c ON cat.id = c.categoria_fk AND c.ativo = true
      WHERE cat.ativo = true
      GROUP BY cat.id, cat.nome, cat.slug, cat.ativo
      ORDER BY cat.nome ASC
    `);

        console.log('\n=== CATEGORIAS ATIVAS COM FEEDS ===');
        console.table(activeCats.rows);

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkFeedCategories();
