
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configurações (Tenta env, fallback para Docker padrao projeto)
const poolConfig = {
    // FORÇANDO PORTA 15432 Conforme solicitação do usuário (Docker)
    // Ignora .env se estiver diferente, para garantir que não bata no banco local (5432)
    port: 15432,
    user: process.env.DB_USER || 'postgres',
    host: 'localhost', // Sempre localhost para acessar o container exposto
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
};

const pool = new Pool(poolConfig);

async function runSQL(filename) {
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations_docker', filename);
        console.log(`📂 Lendo arquivo: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            console.error(`❌ Arquivo não encontrado: ${filename}`);
            return;
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`🚀 Executando ${filename}...`);
        await pool.query(sql);
        console.log(`✅ ${filename} aplicado com sucesso!`);
    } catch (error) {
        console.error(`❌ Erro em ${filename}:`, error.message);
    }
}

async function main() {
    try {
        console.log('🔌 Conectando ao banco...', poolConfig.host, poolConfig.port);
        // 042
        await runSQL('042_update_email_template_lead_perdido_sla_full_details.sql');
        // 043
        await runSQL('043_create_email_template_lead_aceito_cliente.sql');

    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        await pool.end();
    }
}

main();
