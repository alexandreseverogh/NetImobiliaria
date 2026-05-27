const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function diagnose() {
    try {
        const res = await pool.query("SELECT id, username, password, ativo, two_fa_enabled FROM public.users WHERE username = 'admxyz'");
        if (res.rows.length === 0) {
            console.log('❌ Usuário [admxyz] NÃO ENCONTRADO na tabela users.');
            // Listar usuários parecidos
            const all = await pool.query("SELECT username FROM public.users LIMIT 10");
            console.log('Exemplos de usuários existentes:', all.rows.map(r => r.username));
            return;
        }
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
