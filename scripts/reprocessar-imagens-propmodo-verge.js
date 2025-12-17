#!/usr/bin/env node

/**
 * Script para reprocessar imagens dos feeds Propmodo e The Verge Smart Home
 * Este script busca os feeds RSS novamente e atualiza as imagens dos posts existentes
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
  timeout: 15000, // 15 segundos de timeout
});

// Função melhorada para extrair imagem
function extractImage(item) {
  // Tenta múltiplas fontes: enclosure, media:content, media:thumbnail, itunes:image, contentSnippet (HTML parsing), content (HTML parsing)
  let imagem = item.enclosure?.url 
    || (item.media?.$?.url) 
    || (item.mediaThumbnail?.$?.url)
    || (item.mediaThumbnail)
    || (item['itunes:image']?.href)
    || (item['itunes:image'])
    || (item.image?.url)
    || (item.image)
    || null;
  
  // Se não encontrou, tenta extrair do HTML do conteúdo
  if (!imagem && (item.content || item.contentSnippet || item.contentEncoded)) {
    // Limitar tamanho do HTML para evitar processamento muito lento
    let htmlContent = (item.content || item.contentSnippet || item.contentEncoded || '').substring(0, 10000);
    
    // 1. Procurar por tags img no HTML (múltiplas variações) - apenas primeira ocorrência
    const imgPatterns = [
      /<img[^>]+src=["']([^"']+)["']/i,
      /<img[^>]+src=([^\s>]+)/i,
      /<img[^>]+data-src=["']([^"']+)["']/i, // lazy loading
      /<img[^>]+data-lazy-src=["']([^"']+)["']/i, // lazy loading alternativo
    ];
    
    for (const pattern of imgPatterns) {
      const match = htmlContent.match(pattern);
      if (match && match[1]) {
        imagem = match[1];
        break;
      }
    }
    
    // 2. Procurar por meta tags og:image (apenas se não encontrou em img)
    if (!imagem) {
      const ogImageMatch = htmlContent.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        imagem = ogImageMatch[1];
      }
    }
    
    // 3. Procurar por URLs de imagens comuns no texto (apenas se não encontrou antes)
    if (!imagem) {
      const urlMatch = htmlContent.match(/(https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|svg))/i);
      if (urlMatch && urlMatch[1]) {
        imagem = urlMatch[1];
      }
    }
  }
  
  // Limpar URL da imagem (remover query strings problemáticas se necessário)
  if (imagem) {
    // Remover espaços e quebras de linha
    imagem = imagem.trim();
    // Remover caracteres de escape HTML
    imagem = imagem.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Garantir que é uma URL válida
    if (!imagem.startsWith('http://') && !imagem.startsWith('https://')) {
      imagem = null;
    }
    // Remover query strings problemáticas que podem quebrar a imagem
    try {
      const urlObj = new URL(imagem);
      // Manter apenas parâmetros essenciais, remover outros
      const essentialParams = ['w', 'h', 'q', 'fit', 'crop'];
      const newParams = new URLSearchParams();
      urlObj.searchParams.forEach((value, key) => {
        if (essentialParams.includes(key.toLowerCase())) {
          newParams.set(key, value);
        }
      });
      urlObj.search = newParams.toString();
      imagem = urlObj.toString();
    } catch (e) {
      // Se não conseguir parsear como URL, manter como está
    }
  }
  
  return imagem;
}

async function reprocessarImagensPropmodoVerge() {
  const client = await pool.connect();
  
  try {
    console.log('[*] Iniciando reprocessamento de imagens para Propmodo e The Verge Smart Home...\n');
    
    // Buscar fontes específicas
    const fontesResult = await client.query(`
      SELECT id, nome, url_feed 
      FROM feed.feed_fontes 
      WHERE nome IN ('Propmodo', 'The Verge Smart Home')
        AND ativo = true
    `);
    
    if (fontesResult.rows.length === 0) {
      console.log('[*] Nenhuma fonte encontrada (Propmodo ou The Verge Smart Home)');
      return;
    }
    
    let totalAtualizados = 0;
    let totalErros = 0;
    
    for (const fonte of fontesResult.rows) {
      try {
        console.log(`\n[*] Processando: ${fonte.nome} (${fonte.url_feed})`);
        
        // Buscar posts desta fonte sem imagem ou com imagem vazia
        const postsResult = await client.query(`
          SELECT id, titulo, url_original, url_imagem
          FROM feed.feed_conteudos
          WHERE fonte_fk = $1
            AND ativo = true
            AND (url_imagem IS NULL OR url_imagem = '')
          ORDER BY data_publicacao DESC
          LIMIT 50
        `, [fonte.id]);
        
        if (postsResult.rows.length === 0) {
          console.log(`  [i] Nenhum post sem imagem encontrado para ${fonte.nome}`);
          continue;
        }
        
        console.log(`  [*] Encontrados ${postsResult.rows.length} posts sem imagem`);
        
        // Buscar feed RSS com timeout
        console.log(`  [*] Buscando feed RSS...`);
        let feed;
        try {
          feed = await Promise.race([
            parser.parseURL(fonte.url_feed),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout após 30 segundos')), 30000)
            )
          ]);
          console.log(`  [OK] Feed RSS carregado`);
        } catch (error) {
          console.error(`  [ERRO] Erro ao buscar feed RSS:`, error.message);
          continue;
        }
        
        // Criar mapa de URL original -> item do feed
        const feedMap = {};
        for (const item of feed.items || []) {
          if (item.link) {
            feedMap[item.link] = item;
          }
        }
        
        console.log(`  [*] Feed carregado com ${Object.keys(feedMap).length} itens`);
        
        // Atualizar posts desta fonte
        console.log(`  [*] Processando ${postsResult.rows.length} posts...`);
        let processados = 0;
        for (const post of postsResult.rows) {
          try {
            processados++;
            console.log(`  [${processados}/${postsResult.rows.length}] Processando: "${post.titulo.substring(0, 35)}..."`);
            
            const feedItem = feedMap[post.url_original];
            if (!feedItem) {
              console.log(`    [!] Não encontrado no feed`);
              continue;
            }
            
            console.log(`    [*] Extraindo imagem...`);
            const imagem = extractImage(feedItem);
            
            if (!imagem) {
              console.log(`    [!] Nenhuma imagem encontrada`);
              continue;
            }
            
            console.log(`    [*] Imagem encontrada: ${imagem.substring(0, 60)}...`);
            console.log(`    [*] Atualizando banco de dados...`);
            await client.query(
              `UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`,
              [imagem, post.id]
            );
            totalAtualizados++;
            console.log(`    [OK] Atualizado com sucesso\n`);
            
          } catch (error) {
            console.error(`    [ERRO] Erro:`, error.message);
            if (error.stack) {
              console.error(`    [ERRO] Stack:`, error.stack.split('\n')[0]);
            }
          }
        }
        
        console.log(`  [*] Concluído: ${processados} posts processados, ${totalAtualizados} atualizados`);
        // Aguardar um pouco entre feeds
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  [ERRO] Erro ao processar ${fonte.nome}:`, error.message);
        totalErros++;
      }
    }
    
    console.log(`\n[*] Processamento concluído:`);
    console.log(`  Atualizados: ${totalAtualizados}`);
    console.log(`  Erros: ${totalErros}\n`);
    
  } catch (error) {
    console.error('[ERRO] Erro ao reprocessar imagens:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
reprocessarImagensPropmodoVerge().catch(console.error);

