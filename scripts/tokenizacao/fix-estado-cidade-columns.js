const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function fixEstadoCidadeColumns() {
  try {
    console.log('🔄 Corrigindo colunas estado_fk e cidade_fk...\n');
    
    // 1. Alterar estado_fk para VARCHAR(10)
    console.log('1. Alterando estado_fk para VARCHAR(10)...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN estado_fk TYPE VARCHAR(10)
      `);
      console.log('✅ Coluna estado_fk alterada para VARCHAR(10)');
    } catch (error) {
      console.log('⚠️  Erro ao alterar estado_fk:', error.message);
    }
    
    // 2. Alterar cidade_fk para VARCHAR(100)
    console.log('\n2. Alterando cidade_fk para VARCHAR(100)...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN cidade_fk TYPE VARCHAR(100)
      `);
      console.log('✅ Coluna cidade_fk alterada para VARCHAR(100)');
    } catch (error) {
      console.log('⚠️  Erro ao alterar cidade_fk:', error.message);
    }
    
    // 3. Recriar a view imoveis_completos com os tipos corretos
    console.log('\n3. Recriando view imoveis_completos...');
    try {
      await pool.query('DROP VIEW IF EXISTS imoveis_completos CASCADE');
      
      await pool.query(`
        CREATE VIEW imoveis_completos AS
        SELECT 
          i.*,
          ti.nome as tipo_nome,
          fi.nome as finalidade_nome,
          si.nome as status_nome,
          e.nome as estado_nome,
          e.sigla as estado_sigla,
          c.nome as cidade_nome,
          u.nome as corretor_nome,
          COUNT(ii.id) as total_imagens,
          COUNT(CASE WHEN ii.principal = true THEN 1 END) as tem_imagem_principal
        FROM imoveis i
        LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
        LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        LEFT JOIN status_imovel si ON i.status_fk = si.id
        LEFT JOIN estados e ON i.estado_fk = e.sigla
        LEFT JOIN cidades c ON i.cidade_fk = c.nome
        LEFT JOIN users u ON i.created_by = u.id
        LEFT JOIN imovel_imagens ii ON i.id = ii.imovel_id AND ii.ativo = true
        GROUP BY i.id, ti.nome, fi.nome, si.nome, e.nome, e.sigla, c.nome, u.nome
      `);
      console.log('✅ View imoveis_completos recriada');
    } catch (error) {
      console.log('⚠️  Erro ao recriar view:', error.message);
    }
    
    // 4. Verificar estrutura final
    console.log('\n4. Verificando estrutura final...');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      AND column_name IN ('estado_fk', 'cidade_fk', 'status_fk', 'complemento', 'taxa_extra')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Colunas atualizadas:');
    finalColumns.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${length} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n🎉 Correção das colunas concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
  } finally {
    await pool.end();
  }
}

fixEstadoCidadeColumns();



