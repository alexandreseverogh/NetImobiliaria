
// Mock process.env if needed, but defaults should work now
const { Pool } = require('pg');

// Replicate the connection logic from emailService.ts to verify it works with new defaults
const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function verifyConnection() {
    console.log('Testando conexão com configurações ajustadas (Porta 15432)...');
    try {
        const res = await pool.query('SELECT * FROM email_settings WHERE is_active = true LIMIT 1');
        if (res.rows.length > 0) {
            console.log('✅ Conexão bem-sucedida! Configuração de email encontrada:', res.rows[0].from_email);
        } else {
            console.log('✅ Conexão bem-sucedida, mas nenhuma configuração de email ativa encontrada.');
        }
    } catch (err) {
        console.error('❌ Falha na conexão:', err);
    } finally {
        await pool.end();
    }
}

verifyConnection();
