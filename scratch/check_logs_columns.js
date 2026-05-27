const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkColumns() {
  const tables = ['login_logs', 'audit_logs', 'login_attempts', 'audit_2fa_logs', 'email_logs', 'login_logs_purged'];
  console.log('🔍 Checking tenant_id in tables...');
  
  for (const table of tables) {
    try {
      const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [table]);
      
      if (res.rows.length > 0) {
        console.log(`✅ ${table}: tenant_id EXISTS`);
      } else {
        console.log(`❌ ${table}: tenant_id MISSING`);
      }
    } catch (err) {
      console.log(`⚠️ ${table}: ERROR checking (${err.message})`);
    }
  }
  
  await pool.end();
}

checkColumns();
