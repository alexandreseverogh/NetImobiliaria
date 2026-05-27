const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:15432/net_imobiliaria'
});

async function runBigBang() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando Transação do Big Bang...');
    await client.query('BEGIN');

    // 1. Identificar a "Arca" (Nosso usuário mestre 'admin')
    const adminRes = await client.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (adminRes.rows.length === 0) {
      throw new Error("Usuário 'admin' não encontrado! Abortando Big Bang.");
    }
    const adminId = adminRes.rows[0].id;
    console.log('✅ Usuário Master Preservado: ID', adminId);

    // 2. O Expurgo
    console.log('🧹 Limpando Logs, Vínculos e Membresias...');
    await client.query('DELETE FROM login_logs');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM user_tenant_membership');
    await client.query('DELETE FROM user_role_assignments');
    await client.query('DELETE FROM role_permissions');

    console.log('🔗 Quebrando relacionamentos do CRM...');
    // Tabelas que impedem exclusões por chave estrangeira
    const safeDelete = async (table) => {
      try { 
        await client.query(`SAVEPOINT sp_${table}`);
        await client.query(`DELETE FROM ${table}`); 
        await client.query(`RELEASE SAVEPOINT sp_${table}`);
      } catch (e) { 
        await client.query(`ROLLBACK TO SAVEPOINT sp_${table}`);
      }
    };
    await safeDelete('leads_staging_atribuicoes');
    await safeDelete('interacoes');
    await safeDelete('atividades');
    await safeDelete('leads_staging');
    await safeDelete('leads');
    await safeDelete('imovel_prospect_atribuicoes');
    
    console.log('🔥 Deletando Inquilinos e Perfis Lixo...');
    await client.query('DELETE FROM tenants'); // Exclui tudo da tabela de franquias
    await client.query('DELETE FROM user_roles'); // Exclui todos os perfis

    console.log('💀 Limpando Usuários (Exceto o Master)...');
    await client.query('DELETE FROM users WHERE id != $1', [adminId]);

    // 3. A Gênesis do Master
    console.log('👑 Forjando o Perfil Master Absoluto...');
    const createRoleRes = await client.query(`
      INSERT INTO user_roles (name, description, level, is_system_role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, ['Master Platform', 'Perfil supremo da holding (Acesso a tudo universalmente)', 99, true, true]);
    
    const masterRoleId = createRoleRes.rows[0].id;

    console.log('🔗 Concedendo todas as permissões ao Perfil Master...');
    // Busca todas as actions disponíveis e assina para a matriz do Master
    const permissionsRes = await client.query('SELECT id FROM permissions');
    for (const p of permissionsRes.rows) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id, granted_at)
        VALUES ($1, $2, NOW())
      `, [masterRoleId, p.id]);
    }

    console.log('👑 Coroando o usuário "admin"...');
    await client.query(`
      INSERT INTO user_role_assignments (user_id, role_id, assigned_at)
      VALUES ($1, $2, NOW())
    `, [adminId, masterRoleId]);

    await client.query('COMMIT');
    console.log('🎉 BIG BANG FINALIZADO COM SUCESSO! O Banco de Dados está cristalino.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ FATAL: Erro durante o Big Bang. Operação abortada com segurança.');
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

runBigBang();
