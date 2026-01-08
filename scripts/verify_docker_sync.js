
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Conexão direta no Docker (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function verify() {
    try {
        console.log('🔍 Verificando Container (Porta 15432)...');

        // Check parameters
        const r = await pool.query('SELECT valor_ticket_alto FROM parametros LIMIT 1');
        if (r.rows.length > 0) {
            console.log('✅ Parametro valor_ticket_alto encontrado:', r.rows[0].valor_ticket_alto);
        } else {
            console.log('❌ Tabela parametros vazia ou sem coluna.');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

verify();
