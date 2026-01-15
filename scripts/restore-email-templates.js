const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function main() {
    const file040 = path.join(__dirname, '..', 'database', 'migrations_docker', '040_update_email_template_novo_lead_corretor_suppress_mobiliado_latlong.sql');
    const file041 = path.join(__dirname, '..', 'database', 'migrations_docker', '041_update_email_template_novo_lead_corretor_imovel_fk_suppress_mobiliado_latlong.sql');

    try {
        console.log('Lendo migration 040...');
        const sql040 = fs.readFileSync(file040, 'utf8');

        console.log('Executando migration 040...');
        await pool.query(sql040);
        console.log('✅ Migration 040 executada com sucesso.');

        console.log('Lendo migration 041...');
        const sql041 = fs.readFileSync(file041, 'utf8');

        console.log('Executando migration 041...');
        await pool.query(sql041);
        console.log('✅ Migration 041 executada com sucesso.');

    } catch (err) {
        console.error('❌ Erro ao executar migrations:', err);
    } finally {
        pool.end();
    }
}

main();
