#!/usr/bin/env node

/**
 * Script de DEBUG para identificar onde está travando
 * Processa apenas 1 post por vez com logs muito detalhados
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
  timeout: 15000,
});

async function debug() {
  const client = await pool.connect();
  
  try {
    console.log('[*] DEBUG - Processando apenas 1 post\n');
    
    // Buscar apenas Propmodo primeiro
    const fonteResult = await client.query(`
      SELECT id, nome, url_feed 
      FROM feed.feed_fontes 
      WHERE nome = 'Propmodo'
        AND ativo = true
      LIMIT 1
    `);
    
    if (fonteResult.rows.length === 0) {
      console.log('[*] Fonte Propmodo não encontrada');
      return;
    }
    
    const fonte = fonteResult.rows[0];
    console.log(`[*] Fonte: ${fonte.nome}`);
    console.log(`[*] URL: ${fonte.url_feed}\n`);
    
    // Buscar apenas 1 post sem imagem
    console.log('[*] Buscando 1 post sem imagem...');
    const postResult = await client.query(`
      SELECT id, titulo, url_original
      FROM feed.feed_conteudos
      WHERE fonte_fk = $1
        AND ativo = true
        AND (url_imagem IS NULL OR url_imagem = '')
      ORDER BY data_publicacao DESC
      LIMIT 1
    `, [fonte.id]);
    
    if (postResult.rows.length === 0) {
      console.log('[*] Nenhum post sem imagem encontrado');
      return;
    }
    
    const post = postResult.rows[0];
    console.log(`[*] Post encontrado:`);
    console.log(`    ID: ${post.id}`);
    console.log(`    Título: ${post.titulo.substring(0, 50)}...`);
    console.log(`    URL: ${post.url_original.substring(0, 60)}...\n`);
    
    // Buscar feed RSS
    console.log('[*] Buscando feed RSS...');
    console.log(`    Iniciando parseURL...`);
    
    let feed;
    try {
      feed = await Promise.race([
        parser.parseURL(fonte.url_feed),
        new Promise((_, reject) => {
          setTimeout(() => {
            console.log('    [TIMEOUT] 15 segundos se passaram');
            reject(new Error('Timeout após 15 segundos'));
          }, 15000);
        })
      ]);
      console.log(`    [OK] Feed carregado`);
      console.log(`    Total de itens: ${feed.items?.length || 0}\n`);
    } catch (error) {
      console.error(`    [ERRO] Erro ao buscar feed:`, error.message);
      return;
    }
    
    // Procurar item no feed
    console.log('[*] Procurando item no feed...');
    const feedItem = feed.items?.find(item => item.link === post.url_original);
    
    if (!feedItem) {
      console.log('    [!] Item não encontrado no feed');
      console.log(`    URLs no feed (primeiras 3):`);
      feed.items?.slice(0, 3).forEach((item, i) => {
        console.log(`      ${i+1}. ${item.link?.substring(0, 60)}...`);
      });
      return;
    }
    
    console.log('    [OK] Item encontrado no feed\n');
    
    // Extrair imagem - passo a passo
    console.log('[*] Extraindo imagem...');
    
    console.log('    [1] Verificando enclosure...');
    if (feedItem.enclosure?.url) {
      console.log(`        [OK] Encontrado: ${feedItem.enclosure.url.substring(0, 60)}...`);
      await client.query(`UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`, [feedItem.enclosure.url, post.id]);
      console.log('    [OK] Imagem atualizada no banco\n');
      return;
    }
    
    console.log('    [2] Verificando media...');
    if (feedItem.media?.$?.url) {
      console.log(`        [OK] Encontrado: ${feedItem.media.$.url.substring(0, 60)}...`);
      await client.query(`UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`, [feedItem.media.$.url, post.id]);
      console.log('    [OK] Imagem atualizada no banco\n');
      return;
    }
    
    console.log('    [3] Verificando content (HTML)...');
    if (feedItem.content) {
      console.log(`        HTML tem ${feedItem.content.length} caracteres`);
      const htmlLimitado = feedItem.content.substring(0, 2000);
      console.log(`        Primeiros 200 caracteres: ${htmlLimitado.substring(0, 200)}...`);
      
      const imgMatch = htmlLimitado.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        console.log(`        [OK] Imagem encontrada no HTML: ${imgMatch[1].substring(0, 60)}...`);
        await client.query(`UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`, [imgMatch[1], post.id]);
        console.log('    [OK] Imagem atualizada no banco\n');
        return;
      } else {
        console.log('        [!] Nenhuma tag img encontrada');
      }
    }
    
    console.log('    [!] Nenhuma imagem encontrada\n');
    
  } catch (error) {
    console.error('[ERRO]', error);
    console.error('[STACK]', error.stack);
  } finally {
    console.log('[*] Finalizando conexão...');
    client.release();
    await pool.end();
    console.log('[*] Concluído\n');
  }
}

debug().catch(console.error);






