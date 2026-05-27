const pool = require('./src/lib/database/connection');

async function checkPermissions() {
  try {
    const res = await pool.query(`
      SELECT 
        feature_name, 
        COUNT(*) as total_actions,
        ARRAY_AGG(action) as actions
      FROM permissions 
      GROUP BY feature_name 
      ORDER BY total_actions ASC
      LIMIT 30
    `);
    
    console.log('--- Funcionalidades com poucas ações cadastradas ---');
    console.table(res.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkPermissions();
