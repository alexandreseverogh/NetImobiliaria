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

async function checkSimple() {
    try {
        const res = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'expirado' THEN 1 END) as expirados,
             COUNT(CASE WHEN status = 'atribuido' THEN 1 END) as atribuidos
      FROM imovel_prospect_atribuicoes
      WHERE prospect_id = 18
    `);

        console.log('\n📊 Prospect 18:');
        console.log(`   Total de atribuições: ${res.rows[0].total}`);
        console.log(`   Expirados: ${res.rows[0].expirados}`);
        console.log(`   Atribuídos: ${res.rows[0].atribuidos}`);

        if (res.rows[0].atribuidos > 0) {
            console.log('\n✅ SUCESSO! Nova atribuição foi criada!');
        } else {
            console.log('\n❌ FALHA! Nenhuma nova atribuição criada.');
        }

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkSimple();
