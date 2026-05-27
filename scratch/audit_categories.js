const pool = require('./src/lib/database/connection');

async function audit() {
  try {
    const res = await pool.query(`
      SELECT 
        count(*) as total, 
        count(*) FILTER (WHERE category_id IS NULL) as missing 
      FROM system_features
    `);
    console.log('AUDIT RESULT:', res.rows[0]);

    if (parseInt(res.rows[0].missing) > 0) {
      const missingList = await pool.query(`
        SELECT id, name FROM system_features WHERE category_id IS NULL
      `);
      console.log('Features missing category:', missingList.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

audit();
