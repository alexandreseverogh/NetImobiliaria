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
const parser = new Parser();

// Mapeamento de categorias e fontes
const sourcesToSeed = [
  // ===== FONTES BRASILEIRAS =====
  { 
    nome: 'InfoMoney - Mercados', 
    url: 'https://www.infomoney.com.br/mercados/feed/', 
    categoria_slug: 'mercado-financeiro',
    idioma: 'pt'
  },
  { 
    nome: 'Exame - Investimentos', 
    url: 'https://exame.com/invest/feed/', 
    categoria_slug: 'tendencias',
    idioma: 'pt'
  },
  { 
    nome: 'Casa Vogue', 
    url: 'https://casavogue.globo.com/rss/casavogue/', 
    categoria_slug: 'decoracao',
    idioma: 'pt'
  },
  {
    nome: 'CoinTelegraph Brasil',
    url: 'https://br.cointelegraph.com/rss',
    categoria_slug: 'tokenizacao',
    idioma: 'pt'
  },
  
  // ===== FONTES INTERNACIONAIS (serão traduzidas) =====
  {
    nome: 'Reuters Real Estate',
    url: 'https://www.reuters.com/rssFeed/realEstate',
    categoria_slug: 'tendencias',
    idioma: 'en'
  },
  {
    nome: 'Bloomberg Real Estate',
    url: 'https://www.bloomberg.com/feeds/real-estate.rss',
    categoria_slug: 'mercado-financeiro',
    idioma: 'en'
  },
  {
    nome: 'Wall Street Journal Real Estate',
    url: 'https://feeds.a.dj.com/rss/RSSRealEstate.xml',
    categoria_slug: 'mercado-financeiro',
    idioma: 'en'
  },
  {
    nome: 'Forbes Real Estate',
    url: 'https://www.forbes.com/real-estate/feed/',
    categoria_slug: 'tendencias',
    idioma: 'en'
  },
  {
    nome: 'ArchDaily',
    url: 'https://www.archdaily.com/rss',
    categoria_slug: 'arquitetura',
    idioma: 'en'
  },
  {
    nome: 'Dezeen Architecture',
    url: 'https://www.dezeen.com/architecture/feed/',
    categoria_slug: 'arquitetura',
    idioma: 'en'
  },
  {
    nome: 'PropTech News',
    url: 'https://www.proptechnews.com/feed/',
    categoria_slug: 'tecnologia',
    idioma: 'en'
  },
  {
    nome: 'Real Estate Tech News',
    url: 'https://www.realestatetechnews.com/feed/',
    categoria_slug: 'tecnologia',
    idioma: 'en'
  },
  {
    nome: 'CoinTelegraph Real Estate',
    url: 'https://cointelegraph.com/rss/tag/real-estate',
    categoria_slug: 'tokenizacao',
    idioma: 'en'
  }
];

async function fetchAndParseFeed(url) {
    try {
        console.log(`Buscando feed: ${url}`);
        const feed = await parser.parseURL(url);
        return feed.items.slice(0, 5); 
    } catch (error) {
        console.error(`Erro ao buscar feed ${url}:`, error.message);
        return [];
    }
}

async function saveFeedItems(client, items, sourceId, categoryId) {
    let savedCount = 0;
    for (const item of items) {
        const title = item.title;
        const resumo = item.contentSnippet || item.summary || item.content || '';
        const urlOriginal = item.link;
        let urlImagem = item.enclosure?.url || item.itunes?.image || null;
        
        if (!urlImagem && item.content) {
            const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) urlImagem = imgMatch[1];
        }

        const dataPublicacao = item.pubDate ? new Date(item.pubDate) : new Date();

        if (!urlOriginal) continue;

        try {
            await client.query(
                `INSERT INTO feed.feed_conteudos (titulo, resumo, url_original, url_imagem, data_publicacao, fonte_fk, categoria_fk)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (url_original) DO NOTHING`,
                [title, resumo.substring(0, 500) + '...', urlOriginal, urlImagem, dataPublicacao, sourceId, categoryId]
            );
            savedCount++;
        } catch (e) {
            console.error(`Erro ao salvar item ${title}:`, e.message);
        }
    }
    console.log(`Salvos ${savedCount} itens para a fonte ID ${sourceId}`);
}

async function seed() {
  console.log('Iniciando Seed de Fontes e Conteúdos...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Garantir que as tabelas existam (Executando DDL básico se necessário)
    await client.query(`
        CREATE SCHEMA IF NOT EXISTS feed;
        CREATE TABLE IF NOT EXISTS feed.feed_categorias (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(100) NOT NULL UNIQUE,
            slug VARCHAR(100) NOT NULL UNIQUE,
            cor VARCHAR(7),
            icone VARCHAR(50),
            ativo BOOLEAN DEFAULT true,
            ordem INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS feed.feed_fontes (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(200) NOT NULL,
            url_feed VARCHAR(500) NOT NULL,
            tipo VARCHAR(20) DEFAULT 'RSS',
            categoria_fk INTEGER,
            ativo BOOLEAN DEFAULT true,
            ultima_coleta TIMESTAMP,
            status_coleta VARCHAR(20) DEFAULT 'OK',
            msg_erro TEXT,
            intervalo_minutos INTEGER DEFAULT 240,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS feed.feed_conteudos (
            id SERIAL PRIMARY KEY,
            titulo VARCHAR(500) NOT NULL,
            resumo TEXT,
            url_original VARCHAR(1000) NOT NULL UNIQUE,
            url_imagem VARCHAR(1000),
            autor VARCHAR(200),
            data_publicacao TIMESTAMP NOT NULL,
            fonte_fk INTEGER REFERENCES feed.feed_fontes(id),
            categoria_fk INTEGER REFERENCES feed.feed_categorias(id),
            visualizacoes INTEGER DEFAULT 0,
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Seed Categorias (Garantir que existem)
    await client.query(`
        INSERT INTO feed.feed_categorias (nome, slug, cor, icone, ordem) VALUES
        ('Mercado Financeiro', 'mercado-financeiro', '#2563EB', 'CurrencyDollarIcon', 1),
        ('Tecnologia', 'tecnologia', '#7C3AED', 'CpuChipIcon', 2),
        ('Decoração', 'decoracao', '#EA580C', 'HomeModernIcon', 3),
        ('Tendências', 'tendencias', '#D97706', 'ArrowTrendingUpIcon', 4),
        ('Segurança', 'seguranca', '#DC2626', 'ShieldCheckIcon', 5),
        ('História', 'historia', '#4B5563', 'AcademicCapIcon', 6),
        ('Tokenização', 'tokenizacao', '#8B5CF6', 'QrCodeIcon', 7)
        ON CONFLICT (slug) DO UPDATE SET icone = EXCLUDED.icone, cor = EXCLUDED.cor;
    `);

    for (const source of sourcesToSeed) {
      const catRes = await client.query('SELECT id FROM feed.feed_categorias WHERE slug = $1', [source.categoria_slug]);
      if (catRes.rows.length === 0) {
        console.warn(`Categoria ${source.categoria_slug} não encontrada. Pulando.`);
        continue;
      }
      const categoryId = catRes.rows[0].id;

      // Verificar se já existe
      const existing = await client.query('SELECT id FROM feed.feed_fontes WHERE url_feed = $1', [source.url]);
      let sourceId;

      if (existing.rows.length > 0) {
          sourceId = existing.rows[0].id;
          console.log(`Fonte já existe: ${source.nome} (ID: ${sourceId})`);
      } else {
          const sourceRes = await client.query(
            `INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
             VALUES ($1, $2, $3, 'OK', $4)
             RETURNING id`,
            [source.nome, source.url, categoryId, source.idioma || 'pt']
          );
          sourceId = sourceRes.rows[0].id;
          console.log(`Fonte criada: ${source.nome} (ID: ${sourceId}, Idioma: ${source.idioma || 'pt'})`);
      }
      
      // Atualizar idioma se a fonte já existia mas não tinha idioma
      await client.query(
        `UPDATE feed.feed_fontes SET idioma = $1 WHERE id = $2 AND (idioma IS NULL OR idioma = 'pt')`,
        [source.idioma || 'pt', sourceId]
      );

      const items = await fetchAndParseFeed(source.url);
      if (items.length > 0) {
          await saveFeedItems(client, items, sourceId, categoryId);
      }
    }

    await client.query('COMMIT');
    console.log('Seed e Coleta concluídos com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro fatal no seed:', error);
  } finally {
    client.release();
    setTimeout(() => process.exit(0), 1000);
  }
}

seed();
