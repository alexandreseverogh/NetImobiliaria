
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function cleanFeedContent() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Identificar IDs das categorias para manter
        // "Decoração" e "Tendências"
        console.log('🔍 Buscando IDs das categorias "Decoração" e "Tendências"...');

        // Procura por slug ou nome aproximado para ser robusto
        const catQuery = `
      SELECT id, nome, slug 
      FROM feed.feed_categorias 
      WHERE 
        LOWER(unaccent(nome)) LIKE '%decoracao%' OR 
        LOWER(unaccent(nome)) LIKE '%tendencia%' OR
        slug IN ('decoracao', 'tendencias')
    `;

        // Precisamos da extensão unaccent, mas vamos tentar sem primeiro para não falhar se não tiver
        const simpleQuery = `
      SELECT id, nome, slug 
      FROM feed.feed_categorias 
      WHERE 
        slug = 'decoracao' OR 
        slug = 'tendencias' OR
        nome ILIKE '%decoração%' OR 
        nome ILIKE '%tendências%'
    `;

        const resCats = await client.query(simpleQuery);

        if (resCats.rows.length === 0) {
            console.error('❌ Nenhuma categoria encontrada! Abortando para segurança.');
            await client.query('ROLLBACK');
            return;
        }

        const idsManter = resCats.rows.map(c => c.id);
        console.log('✅ Categorias para MANTER:', resCats.rows);
        console.log('🆔 IDs para MANTER:', idsManter);

        // 2. Contar antes
        const countBefore = await client.query('SELECT COUNT(*) FROM feed.feed_conteudos');
        console.log(`📊 Total de conteúdos ANTES: ${countBefore.rows[0].count}`);

        // 3. Deletar conteúdos que NÃO sejam dessas categorias
        // feed.feed_conteudos (categoria_fk)
        const deleteQuery = `
      DELETE FROM feed.feed_conteudos 
      WHERE categoria_fk NOT IN (${idsManter.join(',')})
    `;

        const resDelete = await client.query(deleteQuery);
        console.log(`🗑️ Registros DELETADOS: ${resDelete.rowCount}`);

        // 4. Contar depois para conferência das categorias restantes
        const countAfter = await client.query('SELECT COUNT(*) FROM feed.feed_conteudos');
        console.log(`📊 Total de conteúdos DEPOIS: ${countAfter.rows[0].count}`);

        const checkRemaining = await client.query(`
      SELECT c.nome, COUNT(content.id) as total
      FROM feed.feed_conteudos content
      JOIN feed.feed_categorias c ON content.categoria_fk = c.id
      GROUP BY c.nome
    `);
        console.log('📈 Distribuição restante por categoria:');
        console.table(checkRemaining.rows);

        await client.query('COMMIT');
        console.log('✅ Limpeza concluída e comitada com sucesso!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro durante a limpeza (ROLLBACK executado):', err);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanFeedContent();
