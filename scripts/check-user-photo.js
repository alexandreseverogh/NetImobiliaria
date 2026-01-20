const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:15432/net_imobiliaria',
});

async function checkUserPhoto() {
    const email = 'misleading.marmot.absl@protectsmail.net';
    try {
        const res = await pool.query(`
      SELECT id, nome, email, foto_tipo_mime, length(foto) as foto_size, substring(foto, 1, 50) as foto_prefix
      FROM users 
      WHERE email = $1
    `, [email]);

        if (res.rows.length === 0) {
            console.log('Usuário não encontrado.');
        } else {
            console.log('Dados do usuário:', res.rows[0]);
        }
    } catch (err) {
        console.error('Erro ao consultar:', err);
    } finally {
        await pool.end();
    }
}

checkUserPhoto();
