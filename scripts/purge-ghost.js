const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function purge() {
    try {
        await pool.query("DELETE FROM public.sidebar_menu_items WHERE id = 86");
        console.log('✅ Registro ID 86 (Agenda Médica) removido definitivamente.');
    } catch (err) {
        console.error('❌ Erro ao remover:', err);
    } finally {
        await pool.end();
    }
}

purge();
