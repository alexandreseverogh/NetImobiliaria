#!/usr/bin/env node

/**
 * Script SIMPLIFICADO para reprocessar imagens dos feeds Propmodo e The Verge Smart Home
 * Processa apenas os 10 posts mais recentes de cada fonte para evitar travamentos
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
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['enclosure', 'image'],
      ['itunes:image', 'itunesImage'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
  timeout: 20000, // 20 segundos de timeout
});

// Função simplificada para extrair imagem
function extractImage(item) {
  // 1. Tentar campos diretos primeiro (mais rápido)
  let imagem = item.enclosure?.url 
    || (item.media?.$?.url) 
    || (item.mediaThumbnail?.$?.url)
    || (item['itunes:image']?.href)
    || (item.image?.url)
    || null;
  
  // 2. Se não encontrou, tentar HTML (limitado a primeiros 5000 caracteres para performance)
  if (!imagem && (item.content || item.contentSnippet || item.contentEncoded)) {
    const htmlContent = (item.content || item.contentSnippet || item.contentEncoded || '').substring(0, 5000);
    
    // Procurar primeira tag img
    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      imagem = imgMatch[1];
    }
  }
  
  // 3. Limpar URL
  if (imagem) {
    imagem = imagem.trim().replace(/&amp;/g, '&');
    if (!imagem.startsWith('http://') && !imagem.startsWith('https://')) {
      imagem = null;
    }
  }
  
  return imagem;
}

async function reprocessar() {
  const client = await pool.connect();
  
  try {
    console.log('[*] Reprocessando imagens - Propmodo e The Verge Smart Home\n');
    
    // Buscar fontes
    const fontesResult = await client.query(`
      SELECT id, nome, url_feed 
      FROM feed.feed_fontes 
      WHERE nome IN ('Propmodo', 'The Verge Smart Home')
        AND ativo = true
    `);
    
    if (fontesResult.rows.length === 0) {
      console.log('[*] Nenhuma fonte encontrada');
      return;
    }
    
    let totalAtualizados = 0;
    
    for (const fonte of fontesResult.rows) {
      try {
        console.log(`\n[*] ${fonte.nome}`);
        console.log(`  [*] Buscando feed RSS...`);
        
        // Buscar feed com timeout
        const feed = await Promise.race([
          parser.parseURL(fonte.url_feed),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
        ]);
        
        console.log(`  [OK] Feed carregado (${feed.items?.length || 0} itens)`);
        
        // Buscar apenas 10 posts mais recentes sem imagem
        const postsResult = await client.query(`
          SELECT id, titulo, url_original
          FROM feed.feed_conteudos
          WHERE fonte_fk = $1
            AND ativo = true
            AND (url_imagem IS NULL OR url_imagem = '')
          ORDER BY data_publicacao DESC
          LIMIT 10
        `, [fonte.id]);
        
        if (postsResult.rows.length === 0) {
          console.log(`  [i] Nenhum post sem imagem`);
          continue;
        }
        
        console.log(`  [*] Processando ${postsResult.rows.length} posts...`);
        
        // Criar mapa rápido
        const feedMap = {};
        for (const item of feed.items || []) {
          if (item.link) feedMap[item.link] = item;
        }
        
        // Processar posts
        for (let i = 0; i < postsResult.rows.length; i++) {
          const post = postsResult.rows[i];
          const feedItem = feedMap[post.url_original];
          
          if (!feedItem) {
            console.log(`  [${i+1}/${postsResult.rows.length}] "${post.titulo.substring(0, 30)}..." - Não no feed`);
            continue;
          }
          
          const imagem = extractImage(feedItem);
          if (!imagem) {
            console.log(`  [${i+1}/${postsResult.rows.length}] "${post.titulo.substring(0, 30)}..." - Sem imagem`);
            continue;
          }
          
          await client.query(
            `UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`,
            [imagem, post.id]
          );
          totalAtualizados++;
          console.log(`  [OK] [${i+1}/${postsResult.rows.length}] "${post.titulo.substring(0, 30)}..." - Imagem atualizada`);
        }
        
      } catch (error) {
        console.error(`  [ERRO] ${fonte.nome}:`, error.message);
      }
    }
    
    console.log(`\n[*] Concluído: ${totalAtualizados} imagens atualizadas\n`);
    
  } catch (error) {
    console.error('[ERRO]', error);
  } finally {
    client.release();
    await pool.end();
  }
}

reprocessar().catch(console.error);





