const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.MARKETING_DATABASE_URL
});

async function check() {
  try {
    const { rows: insights } = await pool.query(`
      SELECT i.id, i.date, i.spend, i."campaignId", c.name as camp_name, cl.nome as client_name, seg.name as seg_name
      FROM campanhasmarketingdigital."Insight" i
      LEFT JOIN campanhasmarketingdigital."Campaign" c ON c.id = i."campaignId"
      LEFT JOIN public.clientes cl ON cl.uuid = c.client_id
      LEFT JOIN public.system_segments seg ON seg.id = COALESCE(cl.segment_id, (SELECT segment_id FROM public.tenants WHERE id = c.tenant_id))
      WHERE c.tenant_id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'
      ORDER BY i.date DESC
      LIMIT 10
    `);
    console.log(insights);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
