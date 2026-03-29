
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testFeedQuery() {
  const pool = new Pool({
    host: 'localhost',
    port: 15432,
    user: 'postgres',
    password: 'postgres',
    database: 'net_imobiliaria',
  });

  const query = `
    SELECT 
      c.id, 
      c.titulo, 
      c.ativo as conteudo_ativo, 
      f.status_coleta, 
      f.ativo as fonte_ativa,
      cat.id as cat_id,
      cat.nome as cat_nome,
      cat.ativo as cat_ativa
    FROM feed.feed_conteudos c
    INNER JOIN feed.feed_categorias cat ON c.categoria_fk = cat.id
    INNER JOIN feed.feed_fontes f ON c.fonte_fk = f.id
    WHERE c.ativo = true
      AND f.ativo = true
      AND f.status_coleta = 'OK'
    ORDER BY c.data_publicacao DESC
    LIMIT 10
  `;

  try {
    console.log('--- TESTE DE QUERY DE FEED ---');
    const res = await pool.query(query);
    console.log(`Itens encontrados: ${res.rows.length}`);
    if (res.rows.length > 0) {
      console.log('Exemplo do primeiro item:', JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('AVISO: Nenhum item retornou com os filtros atuais.');
      
      // Diagnóstico adicional: quantos itens ativos existem no total?
      const totalAtivos = await pool.query('SELECT count(*) FROM feed.feed_conteudos WHERE ativo = true');
      console.log(`Total de conteúdos marcados como ativo = true: ${totalAtivos.rows[0].count}`);
      
      // Quantas fontes ativas com status OK?
      const fontesAtivas = await pool.query("SELECT count(*) FROM feed.feed_fontes WHERE ativo = true AND status_coleta = 'OK'");
      console.log(`Total de fontes ativas com status_coleta = 'OK': ${fontesAtivas.rows[0].count}`);
    }
  } catch (err) {
    console.error('Erro na query:', err);
  } finally {
    await pool.end();
  }
}

testFeedQuery();
