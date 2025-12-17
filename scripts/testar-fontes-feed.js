/**
 * Script para testar todas as fontes de feed e identificar problemas
 * Execute: node scripts/testar-fontes-feed.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const Parser = require('rss-parser');

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['enclosure', 'image'],
    ],
  },
  timeout: 10000, // 10 segundos de timeout
});

async function testarFonte(url, nome) {
  try {
    console.log(`\n🔍 Testando: ${nome}`);
    console.log(`   URL: ${url}`);
    
    const feed = await parser.parseURL(url);
    
    console.log(`   ✅ SUCESSO`);
    console.log(`   • Título do feed: ${feed.title || 'N/A'}`);
    console.log(`   • Total de itens: ${feed.items?.length || 0}`);
    
    if (feed.items && feed.items.length > 0) {
      const primeiroItem = feed.items[0];
      console.log(`   • Primeiro item: ${primeiroItem.title?.substring(0, 60) || 'N/A'}...`);
    }
    
    return { success: true, items: feed.items?.length || 0 };
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message}`);
    if (error.code) {
      console.log(`   • Código: ${error.code}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  const client = await pool.connect();
  
  try {
    // Buscar todas as fontes ativas
    const result = await client.query(`
      SELECT id, nome, url_feed, status_coleta, msg_erro
      FROM feed.feed_fontes
      WHERE ativo = true
      ORDER BY nome
    `);
    
    console.log(`\n📊 Testando ${result.rows.length} fontes de feed...\n`);
    console.log('='.repeat(80));
    
    const resultados = [];
    
    for (const fonte of result.rows) {
      const resultado = await testarFonte(fonte.url_feed, fonte.nome);
      resultados.push({
        id: fonte.id,
        nome: fonte.nome,
        url: fonte.url_feed,
        status_atual: fonte.status_coleta,
        erro_atual: fonte.msg_erro,
        ...resultado
      });
      
      // Pequena pausa entre requisições para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 RESUMO DOS TESTES\n');
    
    const sucessos = resultados.filter(r => r.success);
    const falhas = resultados.filter(r => !r.success);
    
    console.log(`✅ Fontes funcionando: ${sucessos.length}`);
    console.log(`❌ Fontes com erro: ${falhas.length}\n`);
    
    if (falhas.length > 0) {
      console.log('❌ FONTES COM ERRO:\n');
      falhas.forEach(f => {
        console.log(`   • ${f.nome}`);
        console.log(`     URL: ${f.url}`);
        console.log(`     Erro: ${f.error}`);
        console.log(`     Status atual no banco: ${f.status_atual}`);
        if (f.erro_atual) {
          console.log(`     Erro registrado: ${f.erro_atual.substring(0, 100)}`);
        }
        console.log('');
      });
    }
    
    // Atualizar status no banco
    console.log('\n🔄 Atualizando status no banco...\n');
    
    for (const resultado of resultados) {
      if (resultado.success) {
        await client.query(
          `UPDATE feed.feed_fontes 
           SET status_coleta = 'OK', msg_erro = NULL 
           WHERE id = $1`,
          [resultado.id]
        );
        console.log(`✅ ${resultado.nome} - Status atualizado para OK`);
      } else {
        await client.query(
          `UPDATE feed.feed_fontes 
           SET status_coleta = 'ERRO', msg_erro = $2 
           WHERE id = $1`,
          [resultado.id, resultado.error.substring(0, 500)]
        );
        console.log(`❌ ${resultado.nome} - Status atualizado para ERRO`);
      }
    }
    
    console.log('\n✅ Teste concluído!\n');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

