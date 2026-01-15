const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function deactivateCategories() {
    try {
        console.log('=== DESATIVANDO CATEGORIAS INDESEJADAS ===\n');

        // Categorias que devem permanecer ATIVAS
        const keepActive = ['Decoração', 'Tendências'];

        // Desativar todas as outras
        const result = await pool.query(`
      UPDATE feed.feed_categorias
      SET ativo = false
      WHERE nome NOT IN ($1, $2)
      RETURNING nome, ativo
    `, keepActive);

        console.log(`✅ ${result.rowCount} categorias desativadas:`);
        console.table(result.rows);

        // Verificar categorias ativas restantes
        const activeResult = await pool.query(`
      SELECT nome, ativo
      FROM feed.feed_categorias
      WHERE ativo = true
      ORDER BY nome
    `);

        console.log('\n=== CATEGORIAS ATIVAS RESTANTES ===');
        console.table(activeResult.rows);

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

deactivateCategories();
