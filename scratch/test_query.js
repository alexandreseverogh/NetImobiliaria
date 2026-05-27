const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const codigo = '13';
  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';
  
  const query = `
        SELECT 
          ic.*,
          i.corretor_fk,
          fi.tipo_destaque as finalidade_tipo_destaque
        FROM imoveis_completos ic
        LEFT JOIN imoveis i ON ic.id = i.id
        LEFT JOIN finalidades_imovel fi ON ic.finalidade_fk = fi.id
        WHERE ic.id = $1 AND i.tenant_id = $2
      `;
  const params = [parseInt(codigo), tenantId];
  
  const res = await pool.query(query, params);
  console.log('Results:', res.rows.length);
  console.table(res.rows);
  await pool.end();
}

check();
