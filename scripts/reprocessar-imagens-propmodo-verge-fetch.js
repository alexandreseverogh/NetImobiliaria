#!/usr/bin/env node

/**
 * Script usando fetch direto ao invés de rss-parser para evitar travamentos
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

// Função para buscar feed com fetch e timeout
async function fetchFeed(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
  
  try {
    console.log(`    [*] Fazendo fetch do feed...`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': url
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xml = await response.text();
    console.log(`    [OK] Feed baixado (${xml.length} caracteres)`);
    return xml;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timeout ao buscar feed (10 segundos)');
    }
    throw error;
  }
}

// Função melhorada para extrair imagens do XML
function extractImageFromXML(xml, targetUrl) {
  // Normalizar URL para busca
  const urlEscaped = targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const urlNormalized = targetUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  
  // Procurar o item completo com a URL alvo
  let itemXml = null;
  
  // Tentar encontrar pelo link completo (múltiplas variações de formato)
  const itemPatterns = [
    new RegExp(`<item[^>]*>([\\s\\S]*?<link[^>]*>\\s*${urlEscaped}[\\s\\S]*?)</item>`, 'i'),
    new RegExp(`<item[^>]*>([\\s\\S]*?<link>\\s*${urlEscaped}[\\s\\S]*?)</item>`, 'i'),
    new RegExp(`<item[^>]*>([\\s\\S]*?${urlEscaped}[\\s\\S]*?)</item>`, 'i'),
    new RegExp(`<item[^>]*>([\\s\\S]*?${urlNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)</item>`, 'i'),
  ];
  
  for (const pattern of itemPatterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      itemXml = match[1];
      break;
    }
  }
  
  if (!itemXml) {
    return null;
  }
  
  // Extrair conteúdo HTML (content:encoded, description, content)
  let htmlContent = '';
  const contentMatches = [
    itemXml.match(/<content:encoded[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/i),
    itemXml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i),
    itemXml.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i),
    itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i),
  ];
  
  for (const match of contentMatches) {
    if (match && match[1]) {
      htmlContent = match[1];
      break;
    }
  }
  
  // Procurar imagem em várias tags e formatos (primeiro no item XML, depois no HTML)
  const searchContent = itemXml + (htmlContent ? '\n' + htmlContent : '');
  
  const patterns = [
    // Tags RSS padrão (no item XML)
    /<enclosure[^>]+url=["']([^"']+)["']/i,
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<itunes:image[^>]+href=["']([^"']+)["']/i,
    // Tags img no conteúdo HTML
    /<img[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+data-src=["']([^"']+)["']/i,
    /<img[^>]+data-lazy-src=["']([^"']+)["']/i,
    // Meta tags og:image
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    // URLs diretas de imagens
    /(https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s<>"']*)?)/i,
    // CDNs específicos
    /(https?:\/\/(cdn\.)?(vox-cdn|propmodo|theverge)\.com[^\s<>"']+\.(jpg|jpeg|png|gif|webp))/i,
  ];
  
  for (const pattern of patterns) {
    const match = searchContent.match(pattern);
    if (match && match[1]) {
      let imagem = match[1].trim()
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#8217;/g, "'");
      
      // Remover query strings problemáticas mas manter alguns parâmetros úteis
      try {
        const urlObj = new URL(imagem);
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
        // Se não conseguir parsear, manter como está
      }
      
      if (imagem.startsWith('http://') || imagem.startsWith('https://')) {
        return imagem;
      }
    }
  }
  
  return null;
}

async function reprocessar() {
  const client = await pool.connect();
  
  try {
    console.log('[*] Reprocessando imagens - Versão com fetch direto\n');
    
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
        
        // Buscar 10 posts mais recentes sem imagem
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
        
        console.log(`  [*] Encontrados ${postsResult.rows.length} posts sem imagem`);
        
        // Buscar feed XML
        let xml;
        try {
          xml = await fetchFeed(fonte.url_feed);
        } catch (error) {
          console.error(`  [ERRO] Erro ao buscar feed:`, error.message);
          continue;
        }
        
        // Processar cada post
        for (let i = 0; i < postsResult.rows.length; i++) {
          const post = postsResult.rows[i];
          console.log(`  [${i+1}/${postsResult.rows.length}] "${post.titulo.substring(0, 35)}..."`);
          
          try {
            console.log(`    [*] Procurando imagem para: ${post.url_original.substring(0, 50)}...`);
            const imagem = extractImageFromXML(xml, post.url_original);
            
            if (!imagem) {
              console.log(`    [!] Nenhuma imagem encontrada no XML do RSS`);
              // Tentar buscar diretamente da URL do post (fazer fetch da página HTML)
              console.log(`    [*] Tentando buscar imagem na página HTML...`);
              try {
                const pageHtml = await fetchFeed(post.url_original);
                const ogImageMatch = pageHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (ogImageMatch && ogImageMatch[1]) {
                  const imagem = ogImageMatch[1].trim().replace(/&amp;/g, '&');
                  console.log(`    [OK] Imagem encontrada via og:image: ${imagem.substring(0, 60)}...`);
                  await client.query(
                    `UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`,
                    [imagem, post.id]
                  );
                  totalAtualizados++;
                  console.log(`    [OK] Atualizado no banco`);
                  continue;
                }
              } catch (pageError) {
                console.log(`    [!] Erro ao buscar página HTML: ${pageError.message}`);
              }
              continue;
            }
            
            console.log(`    [*] Imagem encontrada: ${imagem.substring(0, 70)}...`);
            
            await client.query(
              `UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`,
              [imagem, post.id]
            );
            
            totalAtualizados++;
            console.log(`    [OK] Atualizado no banco`);
            
          } catch (error) {
            console.error(`    [ERRO]`, error.message);
          }
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

