/**
 * Script para corrigir e desativar feeds
 * Execute: node scripts/corrigir-feeds.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

async function executarCorrecoes() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n🔄 Iniciando correções de feeds...\n');
    
    // ============================================
    // PARTE 1: DESATIVAR FEEDS INDESEJADOS
    // ============================================
    
    console.log('📋 Desativando feeds indesejados...\n');
    
    // Dwell
    const resultDwell = await client.query(`
      UPDATE feed.feed_fontes 
      SET ativo = false, status_coleta = 'OK', msg_erro = NULL
      WHERE nome LIKE '%Dwell%' OR url_feed LIKE '%dwell.com%'
      RETURNING id, nome
    `);
    if (resultDwell.rowCount > 0) {
      console.log(`   ✅ Dwell desativado (${resultDwell.rowCount} registro(s))`);
      resultDwell.rows.forEach(r => console.log(`      - ${r.nome}`));
    }
    
    // Forbes Real Estate
    const resultForbes = await client.query(`
      UPDATE feed.feed_fontes 
      SET ativo = false, status_coleta = 'OK', msg_erro = NULL
      WHERE nome LIKE '%Forbes Real Estate%' OR url_feed LIKE '%forbes.com/real-estate%'
      RETURNING id, nome
    `);
    if (resultForbes.rowCount > 0) {
      console.log(`   ✅ Forbes Real Estate desativado (${resultForbes.rowCount} registro(s))`);
      resultForbes.rows.forEach(r => console.log(`      - ${r.nome}`));
    }
    
    // Olhar Digital
    const resultOlhar = await client.query(`
      UPDATE feed.feed_fontes 
      SET ativo = false, status_coleta = 'OK', msg_erro = NULL
      WHERE nome LIKE '%Olhar Digital%' OR url_feed LIKE '%olhardigital%'
      RETURNING id, nome
    `);
    if (resultOlhar.rowCount > 0) {
      console.log(`   ✅ Olhar Digital desativado (${resultOlhar.rowCount} registro(s))`);
      resultOlhar.rows.forEach(r => console.log(`      - ${r.nome}`));
    }
    
    // ============================================
    // PARTE 2: CORRIGIR URLs DE FEEDS IMPORTANTES
    // ============================================
    
    console.log('\n🔧 Corrigindo feeds importantes...\n');
    
    // Apartment Therapy - Tentar URL alternativa
    const resultApartment = await client.query(`
      UPDATE feed.feed_fontes 
      SET url_feed = 'https://www.apartmenttherapy.com/feed',
          status_coleta = 'OK',
          msg_erro = NULL
      WHERE nome LIKE '%Apartment Therapy%'
      RETURNING id, nome, url_feed
    `);
    if (resultApartment.rowCount > 0) {
      console.log(`   ✅ Apartment Therapy atualizado (${resultApartment.rowCount} registro(s))`);
      resultApartment.rows.forEach(r => console.log(`      - ${r.nome}: ${r.url_feed}`));
    }
    
    // Outros feeds importantes - Limpar erros para retestar
    const feedsImportantes = [
      'Architectural Digest',
      'Bloomberg Real Estate',
      'Reuters Real Estate',
      'Wall Street Journal Real Estate',
      'Real Estate Tech News',
      'The Verge Smart Home'
    ];
    
    for (const nomeFeed of feedsImportantes) {
      const result = await client.query(`
        UPDATE feed.feed_fontes 
        SET status_coleta = 'OK', msg_erro = NULL
        WHERE nome LIKE $1
        RETURNING id, nome, url_feed
      `, [`%${nomeFeed}%`]);
      
      if (result.rowCount > 0) {
        console.log(`   ✅ ${nomeFeed} - Status limpo para reteste (${result.rowCount} registro(s))`);
        result.rows.forEach(r => console.log(`      - ${r.nome}: ${r.url_feed}`));
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Correções concluídas com sucesso!\n');
    
    // ============================================
    // VERIFICAR RESULTADOS
    // ============================================
    
    console.log('📊 Resumo:\n');
    
    // Fontes desativadas
    const desativadas = await client.query(`
      SELECT COUNT(*) as total FROM feed.feed_fontes WHERE ativo = false
    `);
    console.log(`   • Fontes desativadas: ${desativadas.rows[0].total}`);
    
    // Fontes ativas
    const ativas = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status_coleta = 'OK') as ok,
        COUNT(*) FILTER (WHERE status_coleta = 'ERRO') as erro
      FROM feed.feed_fontes
      WHERE ativo = true
    `);
    console.log(`   • Fontes ativas com status OK: ${ativas.rows[0].ok}`);
    console.log(`   • Fontes ativas com erro: ${ativas.rows[0].erro}`);
    
    console.log('\n💡 Próximo passo: Execute "npm run feed:testar-fontes" para testar os feeds corrigidos\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro ao executar correções:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executarCorrecoes()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

