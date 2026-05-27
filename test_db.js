const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function test() {
  try {
    console.log('--- DIAGNÓSTICO DE FUNÇÕES ---');
    const res = await pool.query(`
      SELECT n.nspname as schema, p.proname as function, pg_get_function_arguments(p.oid) as arguments 
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE p.proname LIKE '%get_sidebar%';
    `);
    console.table(res.rows);
    
    console.log('--- TESTANDO CHAMADA ---');
    const userId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    try {
        await pool.query('SELECT * FROM public.get_sidebar_menu_for_user($1::uuid, $2::text)', [userId, 'admin']);
        console.log('Sucesso: public.get_sidebar_menu_for_user(uuid, text) existe.');
    } catch (e) {
        console.log('Erro na chamada (uuid, text):', e.message);
    }

    try {
        await pool.query('SELECT * FROM public.get_sidebar_menu_for_user($1::text, $2::text)', [userId, 'admin']);
        console.log('Sucesso: public.get_sidebar_menu_for_user(text, text) existe.');
    } catch (e) {
        console.log('Erro na chamada (text, text):', e.message);
    }

  } catch (err) {
    console.error('Erro geral:', err.message);
  } finally {
    await pool.end();
  }
}

test();
