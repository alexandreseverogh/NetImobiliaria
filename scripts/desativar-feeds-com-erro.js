/**
 * Script para desativar todos os feeds com erro
 * Mantém apenas os feeds que estão funcionando
 * Execute: node scripts/desativar-feeds-com-erro.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

async function desativarFeedsComErro() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n🔄 Desativando feeds com erro...\n');
    
    // Desativar todos os feeds com status ERRO
    const result = await client.query(`
      UPDATE feed.feed_fontes 
      SET ativo = false
      WHERE status_coleta = 'ERRO'
      RETURNING id, nome, url_feed
    `);
    
    console.log(`✅ ${result.rowCount} feed(s) desativado(s):\n`);
    result.rows.forEach((fonte, index) => {
      console.log(`   ${index + 1}. ${fonte.nome}`);
      console.log(`      URL: ${fonte.url_feed}\n`);
    });
    
    await client.query('COMMIT');
    
    // Mostrar resumo
    console.log('='.repeat(80));
    console.log('\n📊 RESUMO FINAL\n');
    
    const resumo = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ativo = true AND status_coleta = 'OK') as ativas_ok,
        COUNT(*) FILTER (WHERE ativo = false) as desativadas,
        COUNT(*) FILTER (WHERE ativo = true) as total_ativas
      FROM feed.feed_fontes
    `);
    
    const { ativas_ok, desativadas, total_ativas } = resumo.rows[0];
    
    console.log(`   ✅ Fontes ativas e funcionando: ${ativas_ok}`);
    console.log(`   ❌ Fontes desativadas: ${desativadas}`);
    console.log(`   📊 Total de fontes ativas: ${total_ativas}\n`);
    
    // Listar fontes que continuam ativas
    const fontesAtivas = await client.query(`
      SELECT nome, url_feed, status_coleta
      FROM feed.feed_fontes
      WHERE ativo = true
      ORDER BY nome
    `);
    
    if (fontesAtivas.rows.length > 0) {
      console.log('📋 FEEDS ATIVOS QUE SERÃO COLETADOS:\n');
      fontesAtivas.rows.forEach((fonte, index) => {
        console.log(`   ${index + 1}. ${fonte.nome} (${fonte.status_coleta})`);
      });
      console.log('');
    }
    
    console.log('✅ Processo concluído!');
    console.log('💡 Os feeds ativos serão coletados e exibidos na landpaging\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro ao desativar feeds:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

desativarFeedsComErro()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

