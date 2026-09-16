const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });

async function check() {
  const { rows } = await pool.query('SELECT "campaignId", date, spend, impressions FROM campanhasmarketingdigital."Insight" WHERE date >= \'2026-06-17\'');
  console.log(rows);
  await pool.end();
}
check();
