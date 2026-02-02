const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'Roberto@2007'
});

async function checkSchema() {
    try {
        console.log('📋 Checking parametros table schema...\n');

        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'parametros'
      ORDER BY ordinal_position
    `);

        if (result.rows.length === 0) {
            console.log('❌ Table parametros not found!');
        } else {
            console.log('✅ Columns in parametros table:');
            result.rows.forEach(row => {
                console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
        }

        console.log('\n📋 Checking current values...\n');
        const values = await pool.query('SELECT * FROM public.parametros LIMIT 1');
        if (values.rows.length > 0) {
            console.log('✅ Current parametros values:');
            Object.entries(values.rows[0]).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        } else {
            console.log('⚠️  No data in parametros table');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
