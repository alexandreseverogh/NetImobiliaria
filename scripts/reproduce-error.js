const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function reproducePatchError() {
  const client = await pool.connect();
  try {
    const tenantId = '883658a7-3115-4a95-92e1-5b3727156d91';
    const newEmail = 'alexandreseverog@gmail.com';
    
    console.log(`🧪 Reproduzindo PATCH... Tenant: ${tenantId}, Email: ${newEmail}`);
    
    await client.query('BEGIN');

    // 1. Verificar proprietário atual
    const currentOwnerRes = await client.query(
      'SELECT user_id FROM user_tenant_membership WHERE tenant_id = $1 AND is_owner = true LIMIT 1',
      [tenantId]
    );
    const currentOwnerId = currentOwnerRes.rows[0].user_id;
    console.log('Dono Atual ID:', currentOwnerId);

    // 2. Localizar usuário alvo
    const userLookup = await client.query('SELECT id FROM users WHERE email = $1', [newEmail]);
    const targetUserId = userLookup.rows[0].id;
    console.log('Usuário Alvo ID:', targetUserId);

    if (targetUserId !== currentOwnerId) {
       console.log('🔄 Executando troca de dono...');
       
       // Update antigo
       await client.query(
         'UPDATE user_tenant_membership SET is_owner = false WHERE tenant_id = $1 AND user_id = $2',
         [tenantId, currentOwnerId]
       );
       console.log('Antigo owner desmarcado.');

       // Vincular novo
       console.log('Tentando vincular novo owner...');
       try {
         await client.query(
            `INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active, is_owner)
             VALUES ($1, $2, (SELECT id FROM user_roles WHERE tenant_id = $2 AND name = 'Administrador' LIMIT 1), true, true)
             ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_owner = true`,
            [targetUserId, tenantId]
         );
         console.log('Inserção OK.');
       } catch (e) {
         console.error('❌ ERRO NA INSERÇÃO:', e.message);
         throw e;
       }
    }

    await client.query('COMMIT');
    console.log('✅ Sucesso!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 ERRO FINAL:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

reproducePatchError();
