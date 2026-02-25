
const pool = require('./src/lib/database/connection.js').default;

async function checkPreco() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'imoveis' AND column_name = 'preco'
    `);
        console.log('Columns info:', res.rows);

        const checkRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'imoveis'::regclass AND contype = 'c'
    `);
        console.log('Constraints info:', checkRes.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPreco();
