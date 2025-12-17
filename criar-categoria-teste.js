const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function criarCategoriaTeste() {
  try {
    console.log('🔍 Criando categoria de teste para exclusão...\n');

    // 1. Criar categoria de teste
    const categoriaTeste = await pool.query(`
      INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active)
      VALUES ('Categoria Teste Exclusão', 'categoria-teste-exclusao', 'Categoria para testar funcionalidade de exclusão', 'TestIcon', '#FF5722', 999, true)
      RETURNING id, name, slug
    `);

    const categoriaId = categoriaTeste.rows[0].id;
    console.log(`✅ Categoria de teste criada:`);
    console.log(`- ID: ${categoriaId}`);
    console.log(`- Nome: ${categoriaTeste.rows[0].name}`);
    console.log(`- Slug: ${categoriaTeste.rows[0].slug}`);

    // 2. Verificar se foi criada corretamente
    const verificacao = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.is_active,
        COUNT(sf.id) as total_features
      FROM system_categorias c
      LEFT JOIN system_features sf ON sf.category_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.slug, c.description, c.is_active
    `, [categoriaId]);

    if (verificacao.rows.length > 0) {
      const cat = verificacao.rows[0];
      console.log(`\n✅ Categoria verificada:`);
      console.log(`- Nome: ${cat.name}`);
      console.log(`- Slug: ${cat.slug}`);
      console.log(`- Descrição: ${cat.description}`);
      console.log(`- Ativa: ${cat.is_active}`);
      console.log(`- Funcionalidades associadas: ${cat.total_features}`);
      
      if (parseInt(cat.total_features) === 0) {
        console.log(`\n🎯 PERFEITO! Esta categoria pode ser excluída via interface.`);
        console.log(`Acesse /admin/categorias e tente excluir a categoria "${cat.name}".`);
      }
    }

    console.log(`\n📝 Para limpar após o teste, execute:`);
    console.log(`DELETE FROM system_categorias WHERE id = ${categoriaId};`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

criarCategoriaTeste();
