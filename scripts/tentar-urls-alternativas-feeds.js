/**
 * Script para tentar URLs alternativas de feeds que estão com erro
 * Execute: node scripts/tentar-urls-alternativas-feeds.js
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
  timeout: 15000, // 15 segundos de timeout
});

// URLs alternativas para testar
const urlsAlternativas = {
  'Apartment Therapy': [
    'https://www.apartmenttherapy.com/feed',
    'https://www.apartmenttherapy.com/rss.xml',
    'https://feeds.feedburner.com/apartmenttherapy/main',
  ],
  'Bloomberg Real Estate': [
    'https://www.bloomberg.com/feeds/real-estate.rss',
    'https://www.bloomberg.com/feeds/real-estate.xml',
    'https://feeds.bloomberg.com/markets/real-estate',
  ],
  'CNET Smart Home': [
    'https://www.cnet.com/rss/news/smart-home/',
    'https://www.cnet.com/rss/smart-home/',
    'https://feeds.cnet.com/smart-home',
  ],
  'PropTech News': [
    'https://www.proptechnews.com/feed/',
    'https://www.proptechnews.com/rss/',
    'https://feeds.feedburner.com/proptechnews',
  ],
  'Real Estate Tech News': [
    'https://www.realestatetechnews.com/feed/',
    'https://www.realestatetechnews.com/rss/',
    'https://feeds.feedburner.com/realestatetechnews',
  ],
  'Reuters Real Estate': [
    'https://www.reuters.com/rssFeed/realEstate',
    'https://www.reuters.com/rssFeed/real-estate',
    'https://feeds.reuters.com/reuters/realEstate',
  ],
  'The Verge Smart Home': [
    'https://www.theverge.com/smart-home/rss/index.xml',
    'https://www.theverge.com/rss/smart-home/index.xml',
    'https://feeds.theverge.com/theverge/smart-home',
  ],
  'Wall Street Journal Real Estate': [
    'https://feeds.a.dj.com/rss/RSSRealEstate.xml',
    'https://feeds.a.dj.com/rss/RSSRealEstate',
    'https://www.wsj.com/xml/rss/3_7085.xml', // WSJ Real Estate
  ],
  'Zillow Research': [
    'https://www.zillow.com/research/data/feed/',
    'https://www.zillow.com/research/feed/',
    'https://feeds.zillow.com/research',
  ],
};

async function testarURL(url, nomeFonte) {
  try {
    console.log(`   🔍 Testando: ${url}`);
    const feed = await parser.parseURL(url);
    
    if (feed.items && feed.items.length > 0) {
      console.log(`   ✅ FUNCIONOU! (${feed.items.length} itens encontrados)`);
      return { success: true, url, items: feed.items.length };
    } else {
      console.log(`   ⚠️ Feed vazio`);
      return { success: false, url, error: 'Feed vazio' };
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message.substring(0, 80)}`);
    return { success: false, url, error: error.message };
  }
}

async function encontrarURLCorreta(nomeFonte) {
  const alternativas = urlsAlternativas[nomeFonte];
  if (!alternativas) {
    console.log(`   ⚠️ Nenhuma URL alternativa configurada para ${nomeFonte}`);
    return null;
  }

  console.log(`\n🔍 Testando URLs alternativas para: ${nomeFonte}`);
  
  for (const url of alternativas) {
    const resultado = await testarURL(url, nomeFonte);
    if (resultado.success) {
      return resultado.url;
    }
    // Pequena pausa entre tentativas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return null;
}

async function main() {
  const client = await pool.connect();
  
  try {
    // Buscar fontes com erro que são importantes
    const fontesComErro = await client.query(`
      SELECT id, nome, url_feed, status_coleta, msg_erro
      FROM feed.feed_fontes
      WHERE ativo = true
        AND status_coleta = 'ERRO'
        AND nome IN (
          'Apartment Therapy',
          'Bloomberg Real Estate',
          'CNET Smart Home',
          'PropTech News',
          'Real Estate Tech News',
          'Reuters Real Estate',
          'The Verge Smart Home',
          'Wall Street Journal Real Estate',
          'Zillow Research'
        )
      ORDER BY nome
    `);
    
    console.log(`\n📊 Encontradas ${fontesComErro.rows.length} fontes importantes com erro\n`);
    console.log('='.repeat(80));
    
    const resultados = [];
    
    for (const fonte of fontesComErro.rows) {
      console.log(`\n🔧 Processando: ${fonte.nome}`);
      console.log(`   URL atual: ${fonte.url_feed}`);
      console.log(`   Erro atual: ${fonte.msg_erro?.substring(0, 100) || 'N/A'}`);
      
      const urlCorreta = await encontrarURLCorreta(fonte.nome);
      
      if (urlCorreta) {
        console.log(`\n   ✅ URL alternativa encontrada: ${urlCorreta}`);
        
        // Atualizar no banco
        await client.query(`
          UPDATE feed.feed_fontes 
          SET url_feed = $1, status_coleta = 'OK', msg_erro = NULL
          WHERE id = $2
        `, [urlCorreta, fonte.id]);
        
        resultados.push({
          nome: fonte.nome,
          urlAntiga: fonte.url_feed,
          urlNova: urlCorreta,
          atualizado: true
        });
      } else {
        console.log(`\n   ❌ Nenhuma URL alternativa funcionou para ${fonte.nome}`);
        resultados.push({
          nome: fonte.nome,
          urlAntiga: fonte.url_feed,
          urlNova: null,
          atualizado: false
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 RESUMO\n');
    
    const atualizados = resultados.filter(r => r.atualizado);
    const naoAtualizados = resultados.filter(r => !r.atualizado);
    
    if (atualizados.length > 0) {
      console.log('✅ FEEDS ATUALIZADOS COM SUCESSO:\n');
      atualizados.forEach(r => {
        console.log(`   • ${r.nome}`);
        console.log(`     Antiga: ${r.urlAntiga}`);
        console.log(`     Nova:   ${r.urlNova}\n`);
      });
    }
    
    if (naoAtualizados.length > 0) {
      console.log('❌ FEEDS QUE AINDA PRECISAM DE ATENÇÃO:\n');
      naoAtualizados.forEach(r => {
        console.log(`   • ${r.nome}`);
        console.log(`     URL atual: ${r.urlAntiga}`);
        console.log(`     Ação: Verificar manualmente ou considerar desativar\n`);
      });
    }
    
    console.log(`\n💡 Próximo passo: Execute "npm run feed:testar-fontes" para verificar se os feeds atualizados estão funcionando\n`);
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

