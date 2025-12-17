const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function migrateSystemFeatures() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migração...');
    
    // 1. Backup
    await client.query('CREATE TABLE IF NOT EXISTS system_features_backup AS SELECT * FROM system_features');
    console.log('✅ Backup criado');
    
    // 2. Atualizar category_id conforme mapeamento
    const updates = [
      // Categoria 1: Sistema
      { names: ['Gestão de Categorias', 'Funcionalidades do Sistema'], category_id: 1 },
      // Categoria 2: Permissões  
      { names: ['Hierarquia de Perfis', 'Gestão de Perfis', 'Configuração de Permissões'], category_id: 2 },
      // Categoria 3: Administrativo
      { names: ['Gestão de Usuários', 'Gestão de Tipos de Documentos', 'Gestão de Categorias de Amenidades', 'Gestão de Amenidades', 'Gestão de Categorias de Proximidades', 'Gestão de Proximidades'], category_id: 3 },
      // Categoria 4: Imóveis
      { names: ['Gestão de Tipos de Imóveis', 'Gestão de Finalidades', 'Gestão de Status de Imóveis', 'Mudança de Status', 'Gestão de Imóveis'], category_id: 4 },
      // Categoria 5: Clientes
      { names: ['Gestão de Clientes'], category_id: 5 },
      // Categoria 6: Proprietários
      { names: ['Gestão de Proprietários'], category_id: 6 },
      // Categoria 7: Dashboard / Relatórios
      { names: ['Dashboards', 'Relatório de Vendas'], category_id: 7 }
    ];
    
    for (const update of updates) {
      for (const name of update.names) {
        const result = await client.query(
          'UPDATE system_features SET category_id = $1 WHERE name = $2',
          [update.category_id, name]
        );
        console.log(`✅ ${name} → categoria ${update.category_id}`);
      }
    }
    
    // 3. Atualizar constraint FK
    await client.query('ALTER TABLE system_features DROP CONSTRAINT IF EXISTS system_features_category_id_fkey');
    await client.query('ALTER TABLE system_features ADD CONSTRAINT system_features_category_id_fkey FOREIGN KEY (category_id) REFERENCES system_categorias(id)');
    console.log('✅ FK constraint atualizada');
    
    // 4. Recriar índices
    await client.query('DROP INDEX IF EXISTS idx_system_features_category');
    await client.query('CREATE INDEX idx_system_features_category_id ON system_features (category_id)');
    await client.query('CREATE INDEX idx_system_features_category_id_active ON system_features (category_id, is_active)');
    console.log('✅ Índices recriados');
    
    // 5. Verificar resultado
    const result = await client.query(`
      SELECT 
        sf.name,
        sc.name as categoria_nome,
        sf.category_id
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.category_id IS NOT NULL
      ORDER BY sc.sort_order, sf.name
    `);
    
    console.log('\n📊 RESULTADO DA MIGRAÇÃO:');
    console.log('='.repeat(50));
    result.rows.forEach(row => {
      console.log(`${row.name} → ${row.categoria_nome} (ID: ${row.category_id})`);
    });
    
    console.log(`\n✅ Migração concluída! ${result.rows.length} funcionalidades atualizadas.`);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateSystemFeatures().catch(console.error);
