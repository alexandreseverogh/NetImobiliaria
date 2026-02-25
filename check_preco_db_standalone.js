
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function checkPreco() {
    try {
        console.log('--- Estrutura da Coluna preco ---');
        const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'imoveis' AND column_name = 'preco'
    `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- Restrições da tabela imoveis ---');
        const checkRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'imoveis'::regclass AND contype = 'c'
    `);
        console.log(JSON.stringify(checkRes.rows, null, 2));

        await pool.end();
    } catch (err) {
        console.error('Erro:', err.message);
        process.exit(1);
    }
}

checkPreco();
