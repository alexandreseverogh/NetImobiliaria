const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});
const userId = '56f4b07b-0133-4e21-a634-6269b5f03a60';
const sql = `
  SELECT role_id, tenant_id, 'membership' as source 
  FROM user_tenant_membership 
  WHERE user_id = $1
  UNION ALL
  SELECT role_id, NULL as tenant_id, 'assignment' as source 
  FROM user_role_assignments 
  WHERE user_id = $1
`;
pool.query(sql, [userId])
.then(res => { console.log(res.rows); pool.end(); })
.catch(err => { console.error(err); pool.end(); });
