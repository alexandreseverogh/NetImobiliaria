const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function deactivateUnwantedFeeds() {
    try {
        console.log('=== DESATIVANDO FEEDS DE CATEGORIAS INDESEJADAS ===\n');

        // Categorias que devem ter seus feeds DESATIVADOS
        const unwantedCategories = ['História', 'Mercado Financeiro', 'Segurança', 'Tecnologia', 'Tokenização'];

        // Buscar IDs das categorias indesejadas
        const catResult = await pool.query(`
      SELECT id, nome
      FROM feed.feed_categorias
      WHERE nome = ANY($1::text[])
    `, [unwantedCategories]);

        console.log('Categorias a desativar feeds:');
        console.table(catResult.rows);

        const categoryIds = catResult.rows.map(r => r.id);

        if (categoryIds.length === 0) {
            console.log('Nenhuma categoria encontrada para desativar feeds.');
            await pool.end();
            return;
        }

        // Desativar todos os feeds dessas categorias
        const result = await pool.query(`
      UPDATE feed.feed_conteudos
      SET ativo = false
      WHERE categoria_fk = ANY($1::int[])
      RETURNING id, titulo, categoria_fk
    `, [categoryIds]);

        console.log(`\n✅ ${result.rowCount} feeds desativados.`);

        // Verificar feeds ativos restantes por categoria
        const activeFeeds = await pool.query(`
      SELECT 
        cat.nome as categoria,
        COUNT(c.id) as total_feeds_ativos
      FROM feed.feed_categorias cat
      LEFT JOIN feed.feed_conteudos c ON cat.id = c.categoria_fk AND c.ativo = true
      WHERE cat.ativo = true
      GROUP BY cat.nome
      ORDER BY cat.nome
    `);

        console.log('\n=== FEEDS ATIVOS POR CATEGORIA ===');
        console.table(activeFeeds.rows);

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

deactivateUnwantedFeeds();
