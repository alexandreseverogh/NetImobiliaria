const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function fix() {
    try {
        const plain = '112233';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(plain, salt);
        
        await pool.query("UPDATE public.users SET password = $1 WHERE username = 'admxyz'", [hash]);
        console.log('✅ Senha de [admxyz] resetada com sucesso para 112233.');
        
        // Verificação dupla
        const res = await pool.query("SELECT password FROM public.users WHERE username = 'admxyz'");
        const match = await bcrypt.compare(plain, res.rows[0].password);
        console.log(`Verificação pós-fix: ${match ? 'SUCESSO ✅' : 'FALHA ❌'}`);
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

fix();
