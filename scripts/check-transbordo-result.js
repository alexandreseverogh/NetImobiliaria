const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function checkResult() {
    try {
        const res = await pool.query(`
      SELECT 
        pa.id, 
        pa.prospect_id, 
        pa.status, 
        u.nome as corretor,
        pa.created_at
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 13
      ORDER BY pa.created_at
    `);

        console.log('\n📋 Histórico de atribuições do Prospect 13:\n');
        console.table(res.rows);

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkResult();
