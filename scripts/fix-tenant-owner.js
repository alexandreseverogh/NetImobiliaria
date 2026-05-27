const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixImobiliariaXYZ() {
  const client = await pool.connect();
  try {
    const tenantId = '883658a7-3115-4a95-92e1-5b3727156d91';
    const alexandreId = '915622de-64a9-4103-b84a-9e81f0c6f675'; // Roberto actually? No, wait.
    
    // Deixe-me consultar os IDs novamente com calma.
    
    console.log('🔄 Corrigindo Administração da Imobiliária XYZ...');
    
    await client.query('BEGIN');

    // 1. Localizar Roberto
    const robertoRes = await client.query("SELECT id FROM users WHERE email = 'robertosalguescamposg@gmail.com' LIMIT 1");
    if (robertoRes.rows.length === 0) {
       console.log('❌ Roberto não encontrado pelo email esperado.');
       return;
    }
    const robertoId = robertoRes.rows[0].id;
    console.log(`✅ Roberto ID: ${robertoId}`);

    // 2. Localizar o Alexandre que está como dono
    const alexRes = await client.query("SELECT id FROM users WHERE email = 'alexandreseverog@gmail.com' LIMIT 1");
    const alexId = alexRes.rows[0].id;

    // 3. Remover Alexandre da Imobiliária XYZ (apenas se ele não for o Roberto disfarçado)
    const deleteRes = await client.query(
      "DELETE FROM user_tenant_membership WHERE tenant_id = $1 AND user_id = $2",
      [tenantId, alexId]
    );
    console.log(`🗑️ Removida associação do Alexandre (Rows: ${deleteRes.rowCount})`);

    // 4. Garantir que Roberto tenha uma Role de Administrador nesse tenant
    const roleRes = await client.query(
      "SELECT id FROM user_roles WHERE tenant_id = $1 AND name = 'Administrador' LIMIT 1",
      [tenantId]
    );
    let roleId = roleRes.rows.length > 0 ? roleRes.rows[0].id : null;

    if (!roleId) {
       console.log('⚡ Criando Role de Administrador para o tenant...');
       const newRole = await client.query(
         "INSERT INTO user_roles (name, description, level, is_system_role, is_active, tenant_id) VALUES ('Administrador', 'Administrador da Unidade', 5, false, true, $1) RETURNING id",
         [tenantId]
       );
       roleId = newRole.rows[0].id;
    }

    // 5. Vincular Roberto como OWNER
    const linkRes = await client.query(
      `INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active, is_owner)
       VALUES ($1, $2, $3, true, true)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_owner = true, role_id = $3`,
      [robertoId, tenantId, roleId]
    );
    console.log('👑 Roberto promovido a OWNER da Imobiliária XYZ');

    await client.query('COMMIT');
    console.log('🚀 Correção concluída com sucesso!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na correção:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixImobiliariaXYZ();
