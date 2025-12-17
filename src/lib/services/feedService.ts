import Parser from 'rss-parser';
import { pool } from '@/lib/database/connection';
import { translateToPortuguese, detectLanguage } from './translationService';

// Interfaces
interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url: string }; // Para imagens
  isoDate?: string;
}

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

/**
 * Busca e processa um feed RSS externo
 * @param url URL do feed RSS
 * @returns Lista de itens processados
 */
export async function fetchAndParseFeed(url: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return feed.items as FeedItem[];
  } catch (error) {
    console.error(`Erro ao processar feed ${url}:`, error);
    throw new Error(`Falha ao processar feed: ${(error as Error).message}`);
  }
}

/**
 * Verifica se o conteúdo é relacionado ao mercado imobiliário
 * @param item Item do feed
 * @returns true se o conteúdo é relacionado ao mercado imobiliário
 */
function isRealEstateRelated(item: FeedItem): boolean {
  // Palavras-chave relacionadas ao mercado imobiliário
  const keywords = [
    // Termos principais
    'imóvel', 'imóveis', 'imobiliário', 'imobiliária', 'imobiliarias',
    'casa', 'casas', 'apartamento', 'apartamentos', 'apartamento',
    'propriedade', 'propriedades',
    'aluguel', 'venda', 'compra', 'locação',
    'financiamento imobiliário', 'crédito imobiliário',
    'mercado imobiliário', 'setor imobiliário',
    'construção', 'construtoras', 'construtor',
    'investimento imobiliário', 'investimentos imobiliários',
    'tokenização imobiliária', 'tokenização',
    'proptech', 'prop tech',
    'real estate', 'realty',
    // Termos específicos
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
    // Termos em inglês (para feeds internacionais)
    'real estate', 'property', 'properties',
    'housing', 'home', 'homes',
    'mortgage', 'rent', 'rental',
    'construction', 'building',
    'investment property'
  ];

  // Buscar palavras-chave no título e resumo
  const searchText = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`.toLowerCase();
  
  // Verificar se pelo menos uma palavra-chave está presente
  return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
}

/**
 * Salva novos itens no banco de dados, ignorando duplicatas
 * @param items Itens do feed
 * @param sourceId ID da fonte (feed.feed_fontes)
 * @param categoryId ID da categoria (feed.feed_categorias)
 */
export async function saveFeedItems(
  items: FeedItem[],
  sourceId: number,
  categoryId: number,
  sourceLanguage: string = 'pt'
): Promise<number> {
  let savedCount = 0;
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Inicia transação para garantir integridade

    for (const item of items) {
      // 1. Validação Básica
      if (!item.title || !item.link) continue;

      // 2. FILTRO: Verificar se o conteúdo é relacionado ao mercado imobiliário
      if (!isRealEstateRelated(item)) {
        console.log(`⏭️ [FeedService] Item ignorado (não relacionado ao mercado imobiliário): ${item.title}`);
        continue;
      }

      // 3. Extração de Dados
      let titulo = item.title.trim();
      const link = item.link.trim();
      let resumo = item.contentSnippet?.substring(0, 500) || ''; // Limita resumo

      // 4. TRADUÇÃO: Traduzir para português se necessário
      // Usa o idioma da fonte (mais eficiente que detectar)
      try {
        if (sourceLanguage !== 'pt') {
          console.log(`🔄 [FeedService] Traduzindo título de ${sourceLanguage} para português: ${titulo.substring(0, 50)}...`);
          titulo = await translateToPortuguese(titulo, sourceLanguage);
          console.log(`✅ [FeedService] Título traduzido: ${titulo.substring(0, 50)}...`);

          if (resumo && resumo.trim().length > 0) {
            console.log(`🔄 [FeedService] Traduzindo resumo de ${sourceLanguage} para português...`);
            resumo = await translateToPortuguese(resumo, sourceLanguage);
          }
        } else {
          console.log(`ℹ️ [FeedService] Conteúdo já em português, pulando tradução`);
        }
      } catch (translationError) {
        console.error(`⚠️ [FeedService] Erro ao traduzir, usando texto original:`, translationError);
        // Continua com o texto original em caso de erro na tradução
      }
      
      // Tenta encontrar imagem (pode variar muito entre feeds)
      // Tenta múltiplas fontes: enclosure, media:content, media:thumbnail, itunes:image, contentSnippet (HTML parsing), content (HTML parsing)
      let imagem = item.enclosure?.url 
        || (item as any).media?.$?.url 
        || (item as any).mediaThumbnail?.$?.url
        || (item as any).mediaThumbnail
        || (item as any)['itunes:image']?.href
        || (item as any)['itunes:image']
        || (item as any).image?.url
        || (item as any).image
        || null;
      
      // Se não encontrou, tenta extrair do HTML do conteúdo
      if (!imagem && (item.content || item.contentSnippet || (item as any).contentEncoded)) {
        const htmlContent = item.content || item.contentSnippet || (item as any).contentEncoded || '';
        
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
      
      // Data de publicação
      const dataPub = item.isoDate ? new Date(item.isoDate) : new Date();

      try {
        // 3. Inserção com "ON CONFLICT DO NOTHING"
        const query = `
          INSERT INTO feed.feed_conteudos (
            titulo, resumo, url_original, url_imagem, data_publicacao, fonte_fk, categoria_fk
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          )
          ON CONFLICT (url_original) DO NOTHING
          RETURNING id
        `;
        
        const values = [titulo, resumo, link, imagem, dataPub, sourceId, categoryId];
        const result = await client.query(query, values);
        
        if (result.rowCount && result.rowCount > 0) {
          savedCount++;
        }
        
      } catch (innerError) {
          // Loga erro de item individual mas não aborta o lote inteiro
          console.error(`Erro ao salvar item ${link}:`, innerError);
      }
    }

    await client.query('COMMIT'); // Confirma transação
  } catch (error) {
    await client.query('ROLLBACK'); // Desfaz se der erro geral na conexão
    console.error('Erro na transação de salvamento de feed:', error);
    throw error;
  } finally {
    client.release(); // Libera conexão pro pool
  }

  return savedCount;
}
