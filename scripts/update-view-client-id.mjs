import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.MARKETING_DATABASE_URL });
await client.connect();

const sql = `
CREATE OR REPLACE VIEW campanhasmarketingdigital.vw_creative_patterns AS
SELECT
  ca.tenant_id,
  c.client_id,
  ca.hook_type,
  ca.is_ugc_style,
  ca.angle,
  ca.emotional_tone,
  ca.is_corporate_style,
  count(DISTINCT a.id) AS ads_count,
  round((avg(i.ctr))::numeric, 2) AS avg_ctr,
  round((avg(i.cpc))::numeric, 2) AS avg_cpc,
  round((sum(i.spend))::numeric, 2) AS total_spend,
  round((avg(
    (i.spend / NULLIF((
      SELECT count(*) FROM campanhasmarketingdigital."Lead" l
      WHERE l."campaignId" = i."campaignId"
    ), 0)::double precision)
  ))::numeric, 2) AS avg_cpl,
  json_agg(DISTINCT jsonb_build_object(
    'assetId', asset.id,
    'adId', a.id,
    'adName', a.name,
    'storageUrl', asset.storage_url
  )) FILTER (WHERE a.id IS NOT NULL) AS sample_ads
FROM campanhasmarketingdigital."CreativeAnalysis" ca
JOIN campanhasmarketingdigital."CreativeAsset" asset ON asset.id = ca.asset_id
JOIN campanhasmarketingdigital."Ad" a ON a.id = asset.ad_id
JOIN campanhasmarketingdigital."AdSet" ads ON ads.id = a."adSetId"
JOIN campanhasmarketingdigital."Campaign" c ON c.id = ads."campaignId"
JOIN campanhasmarketingdigital."Insight" i ON i."campaignId" = ads."campaignId"
WHERE ca.hook_type IS NOT NULL
  AND ca.analysis_status::text = 'done'
  AND asset.is_active = true
GROUP BY ca.tenant_id, c.client_id, ca.hook_type, ca.is_ugc_style, ca.angle, ca.emotional_tone, ca.is_corporate_style
HAVING count(DISTINCT a.id) >= 1
`;

try {
  // DROP first since CREATE OR REPLACE can't reorder columns
  await client.query('DROP VIEW IF EXISTS campanhasmarketingdigital.vw_creative_patterns');
  await client.query(sql);
  console.log('View recreated successfully — client_id column added');
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await client.end();
}
