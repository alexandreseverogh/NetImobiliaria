const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});
pool.query("SELECT id, name, url, permission_required FROM sidebar_menu_items WHERE name IN ('Painel do Sistema', 'Parâmetros', 'Painel Administrativo')")
.then(res => { console.log(res.rows); pool.end(); })
.catch(err => { console.error(err); pool.end(); });
