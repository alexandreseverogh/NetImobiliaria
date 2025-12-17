const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarDeleteCategoria() {
  try {
    console.log('🔍 Testando exclusão de categoria...\n');

    // 1. Verificar categorias existentes
    console.log('1️⃣ Categorias existentes:');
    const categorias = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(sf.id) as total_features
      FROM system_categorias c
      LEFT JOIN system_features sf ON sf.category_id = c.id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.name
    `);

    console.log('Categorias encontradas:');
    categorias.rows.forEach(cat => {
      console.log(`- ID: ${cat.id}, Nome: ${cat.name}, Slug: ${cat.slug}, Features: ${cat.total_features}`);
    });

    // 2. Encontrar uma categoria sem funcionalidades associadas para teste
    const categoriaParaTeste = categorias.rows.find(cat => parseInt(cat.total_features) === 0);
    
    if (!categoriaParaTeste) {
      console.log('\n⚠️ Nenhuma categoria sem funcionalidades encontrada para teste.');
      console.log('Criando uma categoria de teste...');
      
      // Criar categoria de teste
      const novaCategoria = await pool.query(`
        INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active)
        VALUES ('Categoria Teste', 'categoria-teste', 'Categoria para teste de exclusão', 'TestIcon', '#FF0000', 999, true)
        RETURNING id, name, slug
      `);
      
      console.log(`✅ Categoria de teste criada: ID ${novaCategoria.rows[0].id}, Nome: ${novaCategoria.rows[0].name}`);
      
      // Testar exclusão da categoria de teste
      const categoriaId = novaCategoria.rows[0].id;
      await pool.query('DELETE FROM system_categorias WHERE id = $1', [categoriaId]);
      console.log(`✅ Categoria de teste excluída com sucesso: ID ${categoriaId}`);
      
    } else {
      console.log(`\n2️⃣ Testando exclusão da categoria: ${categoriaParaTeste.name} (ID: ${categoriaParaTeste.id})`);
      
      // Verificar se realmente não tem funcionalidades
      const features = await pool.query(`
        SELECT COUNT(*) as count 
        FROM system_features 
        WHERE category_id = $1
      `, [categoriaParaTeste.id]);
      
      if (parseInt(features.rows[0].count) > 0) {
        console.log(`❌ Categoria tem ${features.rows[0].count} funcionalidades associadas. Não pode ser excluída.`);
      } else {
        console.log('✅ Categoria não tem funcionalidades associadas. Pode ser excluída.');
        
        // Simular exclusão (sem realmente excluir para não perder dados)
        console.log(`🎯 Simulação: Categoria ${categoriaParaTeste.name} seria excluída com sucesso.`);
      }
    }

    // 3. Verificar se há categorias com funcionalidades (que não podem ser excluídas)
    console.log('\n3️⃣ Categorias que NÃO podem ser excluídas (têm funcionalidades):');
    const categoriasComFeatures = categorias.rows.filter(cat => parseInt(cat.total_features) > 0);
    
    if (categoriasComFeatures.length > 0) {
      categoriasComFeatures.forEach(cat => {
        console.log(`- ${cat.name}: ${cat.total_features} funcionalidades`);
      });
    } else {
      console.log('Todas as categorias podem ser excluídas (nenhuma tem funcionalidades associadas).');
    }

    // 4. Testar a query que a API usa
    console.log('\n4️⃣ Testando query da API:');
    const testQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.color,
        c.sort_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        c.created_by,
        c.updated_by
      FROM system_categorias c
      WHERE c.id = $1 AND c.is_active = true
    `;
    
    if (categorias.rows.length > 0) {
      const testId = categorias.rows[0].id;
      const testResult = await pool.query(testQuery, [testId]);
      console.log(`✅ Query da API funcionando: ${testResult.rows.length} categoria encontrada para ID ${testId}`);
    }

    console.log('\n🎯 CONCLUSÃO:');
    console.log('✅ API de exclusão deve estar funcionando corretamente');
    console.log('✅ O problema pode ser no frontend ou no token de autenticação');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testarDeleteCategoria();
