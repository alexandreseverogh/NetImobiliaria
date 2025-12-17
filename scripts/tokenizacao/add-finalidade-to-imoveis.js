const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function addFinalidadeToImoveis() {
  try {
    console.log('Verificando se finalidade_id já existe...');
    
    // Verificar se coluna existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' AND column_name = 'finalidade_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna finalidade_id já existe');
    } else {
      // Adicionar coluna finalidade_id
      await pool.query(`
        ALTER TABLE imoveis 
        ADD COLUMN finalidade_id INTEGER REFERENCES finalidades_imovel(id)
      `);
      console.log('✅ Coluna finalidade_id adicionada');
    }
    
    // Criar índice
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade_id ON imoveis(finalidade_id)
    `);
    console.log('✅ Índice criado');
    
    // Dropar e recriar view
    await pool.query('DROP VIEW IF EXISTS imoveis_completos');
    console.log('✅ View antiga removida');
    
    await pool.query(`
      CREATE VIEW imoveis_completos AS
      SELECT 
        i.*,
        ti.nome as tipo_nome,
        si.nome as status_nome,
        si.cor as status_cor,
        fi.nome as finalidade_nome,
        u.nome as corretor_nome,
        COUNT(ii.id) as total_imagens,
        COUNT(CASE WHEN ii.principal = true THEN 1 END) as tem_imagem_principal
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_id = ti.id
      LEFT JOIN status_imovel si ON i.status_id = si.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_id = fi.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN imovel_imagens ii ON i.id = ii.imovel_id AND ii.ativo = true
      WHERE i.ativo = true
      GROUP BY i.id, ti.nome, si.nome, si.cor, fi.nome, u.nome
    `);
    console.log('✅ View imoveis_completos recriada com finalidade');
    
    console.log('\n🎉 Atividade 1 concluída: finalidade_id adicionada à tabela imoveis');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

addFinalidadeToImoveis();
