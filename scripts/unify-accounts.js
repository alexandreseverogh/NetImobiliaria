const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function unifyAlexandre() {
  const client = await pool.connect();
  try {
    const emailOficial = 'alexandreseverog@gmail.com';
    const emailTypo = 'alexandreeverog@gmail.com';
    const novoUsername = 'admxyz';

    console.log('🔄 Iniciando unificação de contas...');
    await client.query('BEGIN');

    const oficialRes = await client.query('SELECT id FROM users WHERE email = $1', [emailOficial]);
    const typoRes = await client.query('SELECT id FROM users WHERE email = $1', [emailTypo]);

    if (oficialRes.rows.length === 0) throw new Error('Conta oficial não encontrada!');
    const oficialId = oficialRes.rows[0].id;

    if (typoRes.rows.length > 0) {
       const typoId = typoRes.rows[0].id;
       console.log(`📍 Unificando conta typo (${typoId}) na oficial (${oficialId})...`);
       
       // 1. Reatribuir Logs de Auditoria
       console.log('Migrando logs de auditoria...');
       await client.query('UPDATE audit_logs SET user_id = $1 WHERE user_id = $2', [oficialId, typoId]);

       // 2. Transferir memberships
       console.log('Migrando vínculos de empresas...');
       await client.query(`
          INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active, is_owner)
          SELECT $1, tenant_id, role_id, is_active, is_owner FROM user_tenant_membership WHERE user_id = $2
          ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_owner = EXCLUDED.is_owner OR user_tenant_membership.is_owner
       `, [oficialId, typoId]);

       // 3. Deletar vínculos antigos
       await client.query('DELETE FROM user_tenant_membership WHERE user_id = $1', [typoId]);
       
       // 4. Deletar usuário typo
       await client.query('DELETE FROM users WHERE id = $1', [typoId]);
       console.log('✅ Conta com erro excluída.');
    }

    // 5. Renomear o username da conta oficial
    console.log(`🏷️ Definindo login global como ${novoUsername}...`);
    await client.query('UPDATE users SET username = $1 WHERE id = $2', [novoUsername, oficialId]);

    await client.query('COMMIT');
    console.log('✨ UNIFICAÇÃO CONCLUÍDA COM SUCESSO!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO NA UNIFICAÇÃO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

unifyAlexandre();
