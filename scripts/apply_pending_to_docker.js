
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function applyPending() {
    const pending = [
        '029_add_valor_ticket_alto_to_parametros.sql',
        '030_create_corretor_scores.sql'
    ];

    try {
        console.log('🚀 Aplicando migrações pendentes no Docker (15432)...');

        for (const file of pending) {
            const sqlPath = path.join(__dirname, '..', 'database', 'migrations', file);
            if (!fs.existsSync(sqlPath)) {
                console.error(`❌ Arquivo não encontrado: ${file}`);
                continue;
            }

            const sql = fs.readFileSync(sqlPath, 'utf8');
            console.log(`▶️ Executando ${file}...`);

            try {
                await pool.query(sql);
                console.log(`   ✅ Sucesso.`);
            } catch (err) {
                console.error(`   ❌ Erro em ${file}:`, err.message);
                // Não para, tenta o próximo
            }
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await pool.end();
    }
}

applyPending();
