/**
 * Processador de Feed Direto (sem depender da API HTTP)
 * 
 * Este script processa jobs diretamente usando o feedService,
 * sem precisar do servidor Next.js rodando
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const Parser = require('rss-parser');

// Configuração do Pool
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

// Importar funções de tradução (versão simplificada para Node.js)
async function translateText(text, targetLang, sourceLang) {
  if (!text || text.trim() === '') return '';
  if (sourceLang && sourceLang.toLowerCase() === targetLang.toLowerCase()) return text;

  // LibreTranslate (gratuito)
  const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
  try {
    const response = await fetch(`${libreTranslateUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text.substring(0, 5000),
        source: sourceLang || 'auto',
        target: targetLang,
        format: 'text',
      }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.translatedText || text;
    }
  } catch (error) {
    console.warn(`⚠️ [Translation] LibreTranslate falhou, tentando MyMemory...`);
  }

  // MyMemory (fallback)
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 5000))}&langpair=${sourceLang || 'en'}|${targetLang}`
    );
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    console.error('❌ [Translation] Erro ao traduzir:', error);
  }

  return text; // Retorna original se falhar
}

// Verificar se conteúdo é relacionado ao mercado imobiliário
function isRealEstateRelated(item) {
  const keywords = [
    'imóvel', 'imóveis', 'imobiliário', 'imobiliária', 'imobiliarias',
    'casa', 'casas', 'apartamento', 'apartamentos',
    'propriedade', 'propriedades',
    'aluguel', 'venda', 'compra', 'locação',
    'financiamento imobiliário', 'crédito imobiliário',
    'mercado imobiliário', 'setor imobiliário',
    'construção', 'construtoras', 'construtor',
    'investimento imobiliário', 'investimentos imobiliários',
    'tokenização imobiliária', 'tokenização',
    'proptech', 'prop tech',
    'real estate', 'realty',
    'selic', 'incc', 'ipca imóveis',
    'habitação', 'habitações',
    'condomínio', 'condomínios',
    'terreno', 'terrenos',
    'lote', 'lotes',
    'escritura', 'escrituras',
    'registro de imóveis',
    'iptu', 'itbi',
    'zoneamento', 'zoneamento urbano',
    'arquitetura', 'arquitetônico',
    'decoração', 'interiores',
    'reforma', 'reformas',
    'mobiliário', 'mobília',
    'real estate', 'property', 'properties',
    'housing', 'home', 'homes',
    'mortgage', 'rent', 'rental',
    'construction', 'building',
    'investment property'
  ];

  const searchText = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`.toLowerCase();
  return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
}

// Buscar e processar feed
async function fetchAndParseFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    console.error(`❌ Erro ao processar feed ${url}:`, error.message);
    throw error;
  }
}

// Salvar itens do feed
async function saveFeedItems(items, sourceId, categoryId, sourceLanguage) {
  let savedCount = 0;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const item of items) {
      if (!item.title || !item.link) continue;

      // Filtrar conteúdo imobiliário
      if (!isRealEstateRelated(item)) {
        continue;
      }

      let titulo = item.title.trim();
      const link = item.link.trim();
      let resumo = item.contentSnippet?.substring(0, 500) || '';

      // Traduzir se necessário
      if (sourceLanguage !== 'pt') {
        try {
          titulo = await translateText(titulo, 'pt', sourceLanguage);
          if (resumo) {
            resumo = await translateText(resumo, 'pt', sourceLanguage);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao traduzir, usando original:`, error);
        }
      }

      // Tenta encontrar imagem (pode variar muito entre feeds)
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
      const dataPub = item.isoDate ? new Date(item.isoDate) : new Date();

      try {
        const query = `
          INSERT INTO feed.feed_conteudos (
            titulo, resumo, url_original, url_imagem, data_publicacao, fonte_fk, categoria_fk
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (url_original) DO NOTHING
          RETURNING id
        `;
        
        const values = [titulo, resumo, link, imagem, dataPub, sourceId, categoryId];
        const result = await client.query(query, values);
        
        if (result.rowCount && result.rowCount > 0) {
          savedCount++;
        }
      } catch (innerError) {
        console.error(`Erro ao salvar item ${link}:`, innerError);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return savedCount;
}

// Processar um job
async function processJob(job) {
  const client = await pool.connect();
  
  try {
    // Buscar informações da fonte
    const fonteResult = await client.query(
      `SELECT url_feed, categoria_fk, COALESCE(idioma, 'pt') as idioma 
       FROM feed.feed_fontes 
       WHERE id = $1`,
      [job.fonte_fk]
    );

    if (fonteResult.rows.length === 0) {
      throw new Error('Fonte não encontrada');
    }

    const fonte = fonteResult.rows[0];

    // Buscar feed
    const items = await fetchAndParseFeed(fonte.url_feed);
    
    // Salvar itens
    const savedCount = await saveFeedItems(
      items, 
      job.fonte_fk, 
      fonte.categoria_fk, 
      fonte.idioma
    );

    // Atualizar job
    await client.query(
      `UPDATE feed.feed_jobs 
       SET status = 'COMPLETED', finalizado_em = NOW(), log_erro = $2 
       WHERE id = $1`,
      [job.id, `Processado com sucesso. ${savedCount} novos itens.`]
    );

    // Atualizar fonte
    await client.query(
      `UPDATE feed.feed_fontes 
       SET ultima_coleta = NOW(), status_coleta = 'OK' 
       WHERE id = $1`,
      [job.fonte_fk]
    );

    return { success: true, savedCount };
  } catch (error) {
    // Marcar job como falhou
    await client.query(
      `UPDATE feed.feed_jobs 
       SET status = 'FAILED', finalizado_em = NOW(), log_erro = $2, tentativas = tentativas + 1 
       WHERE id = $1`,
      [job.id, error.message.substring(0, 1000)]
    );

    // Atualizar fonte
    await client.query(
      `UPDATE feed.feed_fontes 
       SET status_coleta = 'ERRO', msg_erro = $2 
       WHERE id = $1`,
      [job.fonte_fk, error.message.substring(0, 500)]
    );

    throw error;
  } finally {
    client.release();
  }
}

// Processar todos os jobs pendentes
async function processAllPendingJobs() {
  let processedCount = 0;
  let maxIterations = 50;

  while (maxIterations > 0) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN'); // Iniciar transação para o SELECT FOR UPDATE

      // Buscar próximo job pendente
      const jobResult = await client.query(`
        SELECT j.id, j.fonte_fk
        FROM feed.feed_jobs j
        WHERE j.status = 'PENDING'
        ORDER BY j.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (jobResult.rows.length === 0) {
        await client.query('COMMIT'); // Liberar lock
        client.release();
        break; // Não há mais jobs pendentes
      }

      const job = jobResult.rows[0];

      // Marcar como processando dentro da transação
      await client.query(
        `UPDATE feed.feed_jobs SET status = 'PROCESSING', iniciado_em = NOW() WHERE id = $1`,
        [job.id]
      );

      await client.query('COMMIT'); // Commit e liberar lock
      client.release(); // Liberar conexão antes de processar

      // Processar job fora da transação (pode demorar)
      try {
        const result = await processJob(job);
        console.log(`✅ [Cron] Job #${job.id} processado (${result.savedCount} itens)`);
        processedCount++;
      } catch (error) {
        console.error(`❌ [Cron] Erro no Job #${job.id}:`, error.message);
      }

      maxIterations--;
      
      // Aguardar um pouco entre processamentos
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      await client.query('ROLLBACK'); // Em caso de erro, desfazer transação
      client.release();
      console.error('❌ [Cron] Erro ao buscar job:', error.message);
      break;
    }
  }

  if (processedCount > 0) {
    console.log(`\n✅ [Cron] Processamento concluído: ${processedCount} jobs processados\n`);
  } else {
    console.log('\n✅ [Cron] Nenhum job pendente para processar\n');
  }

  return processedCount;
}

// Executar
if (require.main === module) {
  processAllPendingJobs()
    .then(() => {
      console.log('✅ Processamento concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { processAllPendingJobs, processJob };

