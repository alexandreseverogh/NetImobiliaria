const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432
  });

  try {
    await client.connect();
    
    // Simular a query que a API faz para um Super Admin
    console.log('--- Testando Query da API menu-items (Admin View) ---');
    const result = await client.query(`
      SELECT 
        smi.id,
        smi.parent_id,
        smi.name,
        sf.name as feature_name
      FROM sidebar_menu_items smi
      LEFT JOIN system_features sf ON smi.feature_id = sf.id
      ORDER BY smi.order_index ASC
    `);
    
    console.log(`Total de itens encontrados: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.table(result.rows.slice(0, 10)); // Mostrar os primeiros 10
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
