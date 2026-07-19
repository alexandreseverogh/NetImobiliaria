const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });

async function check() {
  const segmentId = '92e5ddd3-4f3b-4f93-9839-6168d09e25e8'; // Imobiliário
  const tenantId = 'efbf62cf-9e28-4b31-a4f6-82a037412353'; // Marketing Digital
  
  // same logic as resolveCampaignIdsBySegment
  const { rows } = await pool.query(
    `SELECT cam.id
     FROM campanhasmarketingdigital."Campaign" cam
     LEFT JOIN public.clientes cl ON cl.uuid = cam."client_id"
     LEFT JOIN public.tenants  t  ON t.id    = cam."tenant_id"
     WHERE cam."tenant_id" = $1::uuid
       AND COALESCE(cl.segment_id, t.segment_id) = $2::uuid`,
    [tenantId, segmentId]
  );
  
  const campaignIds = rows.map(r => r.id);
  console.log('Campaigns in segment:', campaignIds.length);
  
  if (campaignIds.length > 0) {
    const { rows: insights } = await pool.query(
      `SELECT * FROM campanhasmarketingdigital."Insight"
       WHERE "tenant_id" = $1
         AND "campaign_id" = ANY($2::uuid[])
         AND date >= '2026-06-17'::timestamp
         AND date <= '2026-07-17'::timestamp
       ORDER BY date DESC`,
      [tenantId, campaignIds]
    );
    console.log('Insights in last 30 days:', insights.length);
    console.log(insights);
  }
  await pool.end();
}
check();
