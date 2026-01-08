
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:15432/net_imobiliaria?sslmode=disable'
});

async function checkView() {
    try {
        const res = await pool.query('SELECT * FROM imoveis_completos LIMIT 1');
        if (res.rows.length === 0) {
            console.log('View is empty.');
        } else {
            const row = res.rows[0];
            const keys = Object.keys(row);
            console.log('Columns found:');
            keys.forEach(k => console.log(`- ${k}`));

            // Check for large strings/buffers
            keys.forEach(k => {
                const val = row[k];
                if (val) {
                    if (Buffer.isBuffer(val)) {
                        console.log(`Column '${k}' is a BUFFER of length ${val.length}`);
                    } else if (typeof val === 'string' && val.length > 100) {
                        console.log(`Column '${k}' is a STRING of length ${val.length} (first 50 chars: ${val.substring(0, 50)}...)`);
                    }
                }
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkView();
