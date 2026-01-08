
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function test() {
    try {
        // 1. Pegar um corretor qualquer (interno ou externo)
        const userRes = await pool.query("SELECT id, nome FROM users WHERE tipo_corretor IS NOT NULL LIMIT 1");
        if (userRes.rows.length === 0) {
            console.log("Nenhum corretor encontrado para teste.");
            return;
        }
        const user = userRes.rows[0];
        console.log(`Testando com usuário: ${user.nome} (${user.id})`);

        // 2. Simular inserção de XP via SQL direto (simulando o service) para ver se tabelas existem e triggers (se houvesse) funcionam
        // Mas melhor, vamos simular a lógica do service aqui no script para validar a query

        // reset score
        await pool.query("DELETE FROM corretor_scores WHERE user_id = $1", [user.id]);

        // Init score
        await pool.query(`
      INSERT INTO corretor_scores (user_id) VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id]);

        // Add XP (Simulando awardXP)
        const newXP = 500;
        const newLevel = Math.floor(newXP / 1000) + 1;

        await pool.query(`
      UPDATE corretor_scores 
      SET xp_total = $2, nivel = $3, leads_aceitos = leads_aceitos + 1
      WHERE user_id = $1
    `, [user.id, newXP, newLevel]);

        console.log("XP atualizado. Verificando...");

        const check = await pool.query("SELECT * FROM corretor_scores WHERE user_id = $1", [user.id]);
        console.log("Score atual:", check.rows[0]);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

test();
