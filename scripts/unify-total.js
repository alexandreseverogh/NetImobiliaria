const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function unifyEverything() {
  const client = await pool.connect();
  try {
    const emailOficial = 'alexandreseverog@gmail.com';
    const emailTypo = 'alexandreeverog@gmail.com';
    const novoUsername = 'admxyz';

    const oficialRes = await client.query('SELECT id FROM users WHERE email = $1', [emailOficial]);
    const typoRes = await client.query('SELECT id FROM users WHERE email = $1', [emailTypo]);

    if (oficialRes.rows.length === 0) throw new Error('Conta oficial não encontrada!');
    const oficialId = oficialRes.rows[0].id;

    if (typoRes.rows.length > 0) {
       const typoId = typoRes.rows[0].id;
       console.log(`🚀 Unificando conta typo na oficial...`);
       
       await client.query('BEGIN');

       // Tabelas que SABEMOS que existem ou são críticas
       await client.query('UPDATE audit_logs SET user_id = $1 WHERE user_id = $2', [oficialId, typoId]);
       
       // Membership
       await client.query(`
          INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active, is_owner)
          SELECT $1, tenant_id, role_id, is_active, is_owner FROM user_tenant_membership WHERE user_id = $2
          ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_owner = EXCLUDED.is_owner OR user_tenant_membership.is_owner
       `, [oficialId, typoId]);
       await client.query('DELETE FROM user_tenant_membership WHERE user_id = $1', [typoId]);

       // Role Assignments
       await client.query('UPDATE user_role_assignments SET user_id = $1 WHERE user_id = $2', [oficialId, typoId]);
       await client.query('UPDATE user_role_assignments SET assigned_by = $1 WHERE assigned_by = $2', [oficialId, typoId]);

       // Deletar usuário typo
       await client.query('DELETE FROM users WHERE id = $1', [typoId]);
       
       // Renomear username da oficial
       await client.query('UPDATE users SET username = $1 WHERE id = $2', [novoUsername, oficialId]);

       await client.query('COMMIT');
       console.log('✨ UNIFICAÇÃO TOTAL CONCLUÍDA!');
    } else {
       // Apenas renomear em caso de já ter deletado a outra em tentativa parcial
       await client.query('UPDATE users SET username = $1 WHERE email = $2', [novoUsername, emailOficial]);
       console.log('✨ Username atualizado (conta typo não encontrada).');
    }

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ FALHA NA UNIFICAÇÃO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

unifyEverything();
