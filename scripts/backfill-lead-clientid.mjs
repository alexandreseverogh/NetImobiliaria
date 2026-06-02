import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

try {
  // Preview: quantos leads serão afetados
  const preview = await pool.query(`
    SELECT COUNT(*) as total
    FROM campanhasmarketingdigital."Lead" l
    JOIN campanhasmarketingdigital."Campaign" c ON l."campaignId" = c.id
    WHERE c.client_id IS NOT NULL
      AND l.client_id IS NULL
  `);
  console.log(`🔍 Leads a atualizar: ${preview.rows[0].total}`);

  if (Number(preview.rows[0].total) === 0) {
    console.log('ℹ️  Nenhum lead para atualizar. Backfill não necessário.');
    process.exit(0);
  }

  // Preview por cliente
  const byClient = await pool.query(`
    SELECT c.client_id, COUNT(*) as leads
    FROM campanhasmarketingdigital."Lead" l
    JOIN campanhasmarketingdigital."Campaign" c ON l."campaignId" = c.id
    WHERE c.client_id IS NOT NULL
      AND l.client_id IS NULL
    GROUP BY c.client_id
  `);
  console.log('📊 Distribuição por cliente:');
  byClient.rows.forEach(r => console.log(`   client_id=${r.client_id}  →  ${r.leads} leads`));

  // Executa o backfill
  const result = await pool.query(`
    UPDATE campanhasmarketingdigital."Lead" l
    SET client_id = c.client_id
    FROM campanhasmarketingdigital."Campaign" c
    WHERE l."campaignId" = c.id
      AND c.client_id IS NOT NULL
      AND l.client_id IS NULL
  `);

  console.log(`\n✅ Backfill concluído — ${result.rowCount} leads atualizados.`);
} catch (e) {
  console.error('❌ Backfill falhou:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
