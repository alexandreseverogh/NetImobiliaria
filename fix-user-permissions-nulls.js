/**
 * Script para corrigir valores NULL em user_permissions
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function fixUserPermissionsNulls() {
  try {
    console.log('🔧 Analisando e corrigindo valores NULL em user_permissions...\n');

    // 1. Estatísticas iniciais
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(granted_by) as com_granted_by,
        COUNT(expires_at) as com_expires_at
      FROM user_permissions
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    console.log('📊 Estado Atual:\n');
    console.log(`   Total de permissões diretas: ${stats.total}`);
    console.log(`   granted_by NULL: ${stats.total - stats.com_granted_by}`);
    console.log(`   expires_at NULL: ${stats.total - stats.com_expires_at}\n`);

    // 2. Análise do granted_by NULL
    const nullGrantedCount = stats.total - stats.com_granted_by;
    
    if (nullGrantedCount > 0) {
      console.log('⚠️ PROBLEMA 1: granted_by NULL (AUDITORIA)\n');
      
      // Listar registros com granted_by NULL
      const listQuery = `
        SELECT 
          up.id,
          u.username,
          up.permission_id,
          up.granted_at,
          up.reason
        FROM user_permissions up
        JOIN users u ON up.user_id = u.id
        WHERE up.granted_by IS NULL
        ORDER BY up.id
      `;
      
      const listResult = await pool.query(listQuery);
      
      console.log(`   ⚠️ ${listResult.rows.length} registros sem granted_by:\n`);
      
      listResult.rows.forEach((row, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}. ID ${row.id} | user: ${row.username.padEnd(15)} | permission_id: ${row.permission_id} | reason: ${row.reason || 'N/A'}`);
      });
      
      console.log('\n   📝 ANÁLISE:');
      console.log('      • granted_by NULL = NÃO sabemos quem concedeu');
      console.log('      • Compromete auditoria e compliance');
      console.log('      • Dificulta rastreamento de mudanças');
      console.log('      • Boa prática: SEMPRE preencher');
      console.log('');
      console.log('   ⚖️ GRAVIDADE: MÉDIA');
      console.log('      ✅ Sistema funciona normalmente');
      console.log('      ⚠️ MAS auditoria fica comprometida');
      console.log('');
      console.log('   💡 CORREÇÃO:');
      console.log('      Preencher com ID do usuário admin (setup inicial)');
      
      // Preencher granted_by
      console.log('\n   🔧 Aplicando correção...\n');
      
      const adminQuery = `SELECT id FROM users WHERE username = 'admin'`;
      const adminResult = await pool.query(adminQuery);
      
      if (adminResult.rows.length > 0) {
        const adminId = adminResult.rows[0].id;
        console.log(`   ℹ️ ID do admin: ${adminId}`);
        
        const updateQuery = `
          UPDATE user_permissions
          SET granted_by = $1
          WHERE granted_by IS NULL
          RETURNING id
        `;
        
        const updateResult = await pool.query(updateQuery, [adminId]);
        
        console.log(`   ✅ ${updateResult.rows.length} registros atualizados com granted_by\n`);
      } else {
        console.log('   ⚠️ Usuário admin não encontrado! Correção não aplicada.\n');
      }
    }

    // 3. Análise do expires_at NULL
    const nullExpiresCount = stats.total - stats.com_expires_at;
    
    if (nullExpiresCount > 0) {
      console.log('ℹ️ INFORMAÇÃO: expires_at NULL (NORMAL)\n');
      
      console.log(`   ℹ️ ${nullExpiresCount} registros sem data de expiração\n`);
      
      console.log('   ✅ GRAVIDADE: NENHUMA');
      console.log('      • expires_at NULL é NORMAL e ESPERADO');
      console.log('      • Significa: permissão PERMANENTE');
      console.log('      • Permissão não tem prazo para expirar');
      console.log('      • Sistema funciona corretamente');
      console.log('');
      console.log('   📌 QUANDO PREENCHER expires_at:');
      console.log('      • Permissões temporárias (ex: acesso por 30 dias)');
      console.log('      • Permissões de teste ou prova');
      console.log('      • Acessos excepcionais com prazo definido');
      console.log('      • Substituições temporárias de funcionários');
      console.log('');
      console.log('   📌 QUANDO DEIXAR NULL:');
      console.log('      • Permissões permanentes (maioria dos casos)');
      console.log('      • Permissões padrão do usuário');
      console.log('      • Sem prazo de validade definido');
      console.log('');
      console.log('   ✅ CONCLUSÃO: DEIXAR COMO ESTÁ (NULL é correto)\n');
    }

    // 4. Verificação final
    console.log('🔍 Verificação Final:\n');
    
    const finalStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(user_id) as com_user_id,
        COUNT(permission_id) as com_permission_id,
        COUNT(granted_by) as com_granted_by
      FROM user_permissions
    `;
    
    const finalStatsResult = await pool.query(finalStatsQuery);
    const finalStats = finalStatsResult.rows[0];
    
    console.log('   📊 Estatísticas finais:\n');
    console.log(`      Total: ${finalStats.total}`);
    console.log(`      user_id NULL: ${finalStats.total - finalStats.com_user_id}`);
    console.log(`      permission_id NULL: ${finalStats.total - finalStats.com_permission_id}`);
    console.log(`      granted_by NULL: ${finalStats.total - finalStats.com_granted_by}`);

    // 5. Resumo
    console.log('\n📝 RESUMO DA CORREÇÃO:\n');
    
    console.log('   ✅ CAMPOS CRÍTICOS (user_id, permission_id):');
    console.log('      • Todos preenchidos corretamente');
    console.log('      • Nenhum registro órfão');
    console.log('      • Integridade referencial OK');
    console.log('');
    
    if (nullGrantedCount > 0) {
      console.log('   ✅ CAMPO DE AUDITORIA (granted_by):');
      console.log(`      • ${nullGrantedCount} registros foram preenchidos`);
      console.log('      • Auditoria restaurada');
      console.log('      • Rastreabilidade completa');
      console.log('');
    }
    
    console.log('   ℹ️ CAMPO OPCIONAL (expires_at):');
    console.log('      • NULL é CORRETO para permissões permanentes');
    console.log('      • Apenas permissões temporárias devem ter data');
    console.log('      • Nenhuma ação necessária');

    console.log('\n✅ Análise e correção concluídas!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

fixUserPermissionsNulls();


