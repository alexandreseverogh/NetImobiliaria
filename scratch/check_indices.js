const { Client } = require('pg');
async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT
          t.relname AS table_name,
          i.relname AS index_name,
          a.attname AS column_name
      FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = 'user_tenant_membership'
      ORDER BY
          t.relname,
          i.relname;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
