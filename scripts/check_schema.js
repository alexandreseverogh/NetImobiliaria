const pool = require('./src/lib/database/connection').default;

async function checkSchema() {
  try {
    const rolesColumns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_roles'");
    console.log('user_roles columns:', rolesColumns.rows);

    const assignmentsColumns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_role_assignments'");
    console.log('user_role_assignments columns:', assignmentsColumns.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
