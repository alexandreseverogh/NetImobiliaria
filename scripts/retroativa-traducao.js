
/**
 * Script de Tradução Retroativa para Feeds
 * Este script traduz as notícias antigas que já estão no banco de dados para português.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

/**
 * Função simplificada de tradução (usa MyMemory API gratuita)
 */
async function translateText(text, sourceLang = 'en') {
  if (!text || text.trim().length === 0) return text;
  
  // Se parecer já estar em português (heurística simples)
  const ptIndicators = ['imóvel', 'casa', 'apartamento', 'mercado', 'venda', 'aluguel'];
  if (ptIndicators.some(word => text.toLowerCase().includes(word))) {
    return text;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=${sourceLang}|pt-BR`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Erro HTTP na API: ${response.status}`);
      return text;
    }
    
    const data = await response.json();
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      console.error(`❌ Erro da API MyMemory: ${data.responseStatus} - ${data.responseDetails}`);
    }
  } catch (e) {
    console.error('Erro na tradução do item:', e.message);
  }
  return text;
}

async function run() {
  console.log('🔄 Iniciando tradução retroativa de feeds...');
  
  const client = await pool.connect();
  try {
    // Buscar notícias de fontes marcadas como 'en'
    const query = `
      SELECT c.id, c.titulo, c.resumo, f.nome as fonte_nome
      FROM feed.feed_conteudos c
      JOIN feed.feed_fontes f ON c.fonte_fk = f.id
      WHERE f.idioma = 'en'
      ORDER BY c.data_publicacao DESC
      LIMIT 20 -- Reduzido para 20 itens por execução para evitar bloqueios
    `;
    
    const res = await client.query(query);
    console.log(`📋 Encontrados ${res.rowCount} itens (amostra de 100) para revisar.`);

    let translatedCount = 0;

    for (const item of res.rows) {
      console.log(`\n📄 Processando: "${item.titulo.substring(0, 40)}..." [Fonte: ${item.fonte_nome}]`);
      
      const novoTitulo = await translateText(item.titulo);
      const novoResumo = await translateText(item.resumo);

      if (novoTitulo !== item.titulo || novoResumo !== item.resumo) {
        await client.query(
          'UPDATE feed.feed_conteudos SET titulo = $1, resumo = $2 WHERE id = $3',
          [novoTitulo, novoResumo, item.id]
        );
        console.log(`✅ Traduzido com sucesso.`);
        translatedCount++;
        // Pausa maior de 2 segundos para respeitar a API gratuita
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`⏭️  Já parecia estar em português ou falhou, pulando...`);
      }
    }

    console.log(`\n✨ Concluído! ${translatedCount} notícias foram traduzidas.`);
    if (res.rowCount === 100) {
      console.log('💡 Dica: Você pode rodar o script novamente para traduzir o próximo lote de 100.');
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
