const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testPatch() {
  try {
    const tenantId = '883658a7-3115-4a95-92e1-5b3727156d91';
    console.log(`🧪 Testando PATCH para Tenant ${tenantId}...`);
    
    // Simular o que o frontend envia
    const data = {
      name: 'Imobiliária XYZ',
      admin_nome: 'ROBERTO SEVERO',
      admin_email: 'alexandreseverog@gmail.com' // Este email já é do Alexandre!
    };

    console.log('Body:', data);

    // Lógica similar ao route.ts
    const allowedFields = ['name', 'slug', 'segment_id', 'status', 'logo', 'logo_url', 'logo_mime_type', 'cnpj_cpf', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep', 'telefone', 'email_contato', 'requires_2fa'];
    const fields = Object.keys(data).filter(k => allowedFields.includes(k));
    const values = fields.map(k => data[k]);

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const query = `UPDATE tenants SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    
    console.log('Executando update tenant...');
    await pool.query(query, [tenantId, ...values]);
    console.log('✅ Update tenant OK');

    if (data.admin_nome || data.admin_email) {
       console.log('Executando update admin...');
       const ownerRes = await pool.query(
         'SELECT user_id FROM user_tenant_membership WHERE tenant_id = $1 AND is_owner = true LIMIT 1',
         [tenantId]
       );
       const targetUserId = ownerRes.rows[0].user_id;
       console.log(`Target User ID: ${targetUserId}`);

       const userFields = [];
       const userValues = [];
       if (data.admin_nome) { userFields.push('nome = $' + (userFields.length + 1)); userValues.push(data.admin_nome); }
       if (data.admin_email) { userFields.push('email = $' + (userFields.length + 1)); userValues.push(data.admin_email); }

       const userUpdateQuery = `UPDATE users SET ${userFields.join(', ')}, updated_at = NOW() WHERE id = $${userFields.length + 1}`;
       console.log('Query:', userUpdateQuery);
       console.log('Values:', [...userValues, targetUserId]);
       
       await pool.query(userUpdateQuery, [...userValues, targetUserId]);
       console.log('✅ Update admin OK');
    }

  } catch (err) {
    console.error('❌ ERRO CAPTURADO:', err.message);
    if (err.detail) console.log('Detalhe:', err.detail);
  } finally {
    await pool.end();
  }
}

testPatch();
