/**
 * Script para reprocessar feeds e atualizar imagens que estão faltando
 * Útil quando melhoramos a extração de imagens
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
    const htmlContent = item.content || item.contentSnippet || item.contentEncoded || '';
    
    // 1. Procurar por tags img no HTML (múltiplas variações)
    const imgMatches = [
      htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i),
      htmlContent.match(/<img[^>]+src=([^\s>]+)/i),
      htmlContent.match(/<img[^>]+data-src=["']([^"']+)["']/i), // lazy loading
      htmlContent.match(/<img[^>]+data-lazy-src=["']([^"']+)["']/i), // lazy loading alternativo
    ];
    
    for (const match of imgMatches) {
      if (match && match[1]) {
        imagem = match[1];
        break;
      }
    }
    
    // 2. Procurar por meta tags og:image
    if (!imagem) {
      const ogImageMatch = htmlContent.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        imagem = ogImageMatch[1];
      }
    }
    
    // 3. Procurar por URLs de imagens comuns no texto
    if (!imagem) {
      const urlMatch = htmlContent.match(/(https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|svg))/i);
      if (urlMatch && urlMatch[1]) {
        imagem = urlMatch[1];
      }
    }
    
    // 4. Procurar por URLs de CDN comuns (cdn.propmodo.com, cdn.vox-cdn.com para The Verge)
    if (!imagem) {
      const cdnMatch = htmlContent.match(/(https?:\/\/[^\s<>"']*(cdn|images|img|assets)[^\s<>"']*\.(jpg|jpeg|png|gif|webp))/i);
      if (cdnMatch && cdnMatch[1]) {
        imagem = cdnMatch[1];
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

async function reprocessarImagens() {
  const client = await pool.connect();
  
  try {
    console.log('[*] Buscando posts sem imagem...\n');
    
    // Buscar posts sem imagem ou com imagem null
    const postsSemImagem = await client.query(`
      SELECT c.id, c.url_original, c.titulo, f.url_feed, f.nome as fonte_nome
      FROM feed.feed_conteudos c
      JOIN feed.feed_fontes f ON c.fonte_fk = f.id
      WHERE (c.url_imagem IS NULL OR c.url_imagem = '')
        AND c.ativo = true
        AND f.ativo = true
      ORDER BY c.data_publicacao DESC
      LIMIT 50
    `);
    
    if (postsSemImagem.rows.length === 0) {
      console.log('[*] Nenhum post sem imagem encontrado.\n');
      return;
    }
    
    console.log(`[*] Encontrados ${postsSemImagem.rows.length} posts sem imagem\n`);
    
    let atualizados = 0;
    let erros = 0;
    
    // Agrupar por fonte para processar feeds uma vez
    const postsPorFonte = {};
    for (const post of postsSemImagem.rows) {
      if (!postsPorFonte[post.url_feed]) {
        postsPorFonte[post.url_feed] = {
          url_feed: post.url_feed,
          fonte_nome: post.fonte_nome,
          posts: []
        };
      }
      postsPorFonte[post.url_feed].posts.push(post);
    }
    
    // Processar cada fonte
    for (const [urlFeed, dados] of Object.entries(postsPorFonte)) {
      try {
        console.log(`[*] Processando feed: ${dados.fonte_nome} (${dados.posts.length} posts)`);
        
        // Buscar feed RSS
        const feed = await parser.parseURL(urlFeed);
        
        // Criar mapa de URL original -> item do feed
        const feedMap = {};
        for (const item of feed.items || []) {
          if (item.link) {
            feedMap[item.link] = item;
          }
        }
        
        // Atualizar posts desta fonte
        for (const post of dados.posts) {
          const feedItem = feedMap[post.url_original];
          if (feedItem) {
            const imagem = extractImage(feedItem);
            if (imagem) {
              await client.query(
                `UPDATE feed.feed_conteudos SET url_imagem = $1 WHERE id = $2`,
                [imagem, post.id]
              );
              atualizados++;
              console.log(`  [OK] Post "${post.titulo.substring(0, 50)}..." - Imagem encontrada`);
            } else {
              console.log(`  [!] Post "${post.titulo.substring(0, 50)}..." - Imagem nao encontrada no feed`);
            }
          } else {
            console.log(`  [!] Post "${post.titulo.substring(0, 50)}..." - Nao encontrado no feed atual`);
          }
        }
        
        // Aguardar um pouco entre feeds
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  [ERRO] Erro ao processar feed ${dados.fonte_nome}:`, error.message);
        erros++;
      }
    }
    
    console.log(`\n[*] Processamento concluido:`);
    console.log(`  Atualizados: ${atualizados}`);
    console.log(`  Erros: ${erros}`);
    console.log(`  Total processado: ${postsSemImagem.rows.length}\n`);
    
  } catch (error) {
    console.error('[ERRO] Erro ao reprocessar imagens:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
reprocessarImagens()
  .then(() => {
    console.log('[*] Script concluido');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ERRO] Erro fatal:', error);
    process.exit(1);
  });

