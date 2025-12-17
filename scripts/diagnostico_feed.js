require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

async function diagnostico() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DIAGNÓSTICO DO FEED\n');
    console.log('='.repeat(50));
    
    // 1. Verificar se o schema existe
    console.log('\n1️⃣ Verificando Schema...');
    const schemaCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'feed'
      ) as schema_exists;
    `);
    console.log(`   Schema 'feed' existe: ${schemaCheck.rows[0].schema_exists ? '✅ SIM' : '❌ NÃO'}`);
    
    if (!schemaCheck.rows[0].schema_exists) {
      console.log('\n❌ Schema não existe! Execute a migration primeiro.');
      return;
    }
    
    // 2. Verificar tabelas
    console.log('\n2️⃣ Verificando Tabelas...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'feed'
      ORDER BY table_name;
    `);
    console.log(`   Tabelas encontradas: ${tables.rows.length}`);
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));
    
    // 3. Verificar categorias
    console.log('\n3️⃣ Verificando Categorias...');
    const categorias = await client.query(`
      SELECT COUNT(*) as total FROM feed.feed_categorias;
    `);
    console.log(`   Total de categorias: ${categorias.rows[0].total}`);
    
    const categoriasList = await client.query(`
      SELECT id, nome, slug, ativo FROM feed.feed_categorias LIMIT 10;
    `);
    if (categoriasList.rows.length > 0) {
      console.log('   Primeiras categorias:');
      categoriasList.rows.forEach(c => {
        console.log(`   - [${c.id}] ${c.nome} (${c.slug}) - ${c.ativo ? '✅ Ativo' : '❌ Inativo'}`);
      });
    }
    
    // 4. Verificar fontes
    console.log('\n4️⃣ Verificando Fontes...');
    const fontes = await client.query(`
      SELECT COUNT(*) as total FROM feed.feed_fontes;
    `);
    console.log(`   Total de fontes: ${fontes.rows[0].total}`);
    
    const fontesList = await client.query(`
      SELECT id, nome, url_feed, ativo, status_coleta FROM feed.feed_fontes LIMIT 10;
    `);
    if (fontesList.rows.length > 0) {
      console.log('   Primeiras fontes:');
      fontesList.rows.forEach(f => {
        console.log(`   - [${f.id}] ${f.nome} - ${f.ativo ? '✅ Ativo' : '❌ Inativo'} (${f.status_coleta || 'N/A'})`);
      });
    }
    
    // 5. Verificar conteúdos
    console.log('\n5️⃣ Verificando Conteúdos...');
    const conteudos = await client.query(`
      SELECT COUNT(*) as total FROM feed.feed_conteudos;
    `);
    console.log(`   Total de conteúdos: ${conteudos.rows[0].total}`);
    
    const conteudosAtivos = await client.query(`
      SELECT COUNT(*) as total FROM feed.feed_conteudos WHERE ativo = true;
    `);
    console.log(`   Conteúdos ativos: ${conteudosAtivos.rows[0].total}`);
    
    // 6. Testar query da API
    console.log('\n6️⃣ Testando Query da API...');
    const apiQuery = await client.query(`
      SELECT 
        c.id, 
        c.titulo, 
        c.resumo, 
        c.url_original, 
        c.url_imagem, 
        c.data_publicacao,
        cat.nome as categoria_nome,
        cat.cor as categoria_cor,
        cat.icone as categoria_icone,
        f.nome as fonte_nome
      FROM feed.feed_conteudos c
      JOIN feed.feed_categorias cat ON c.categoria_fk = cat.id
      JOIN feed.feed_fontes f ON c.fonte_fk = f.id
      WHERE c.ativo = true
      ORDER BY c.data_publicacao DESC
      LIMIT 4
    `);
    
    console.log(`   Resultados da query: ${apiQuery.rows.length} posts`);
    if (apiQuery.rows.length > 0) {
      console.log('   ✅ API deve retornar dados!');
      apiQuery.rows.forEach((post, idx) => {
        console.log(`   ${idx + 1}. ${post.titulo.substring(0, 50)}...`);
      });
    } else {
      console.log('   ❌ API não retornará dados - feed vazio ou sem posts ativos');
    }
    
    // 7. Verificar jobs
    console.log('\n7️⃣ Verificando Jobs...');
    try {
      const jobs = await client.query(`
        SELECT COUNT(*) as total FROM feed.feed_jobs;
      `);
      console.log(`   Total de jobs: ${jobs.rows[0].total}`);
    } catch (e) {
      console.log('   ⚠️ Tabela feed_jobs não existe (pode ser normal)');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnóstico concluído!\n');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnostico().catch(console.error);

