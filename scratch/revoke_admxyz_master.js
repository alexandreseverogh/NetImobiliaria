const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function fixAdmXyz() {
  try {
    console.log('🚀 Revogando acesso Global (Master) do usuário admxyz...');
    
    // Deleta os vínculos globais do admxyz
    const result = await pool.query(`
      DELETE FROM user_role_assignments 
      WHERE user_id = (SELECT id FROM users WHERE username = 'admxyz')
      RETURNING *;
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Acesso Master revogado com sucesso. O usuário admxyz agora é apenas um mortal (Tenant).');
    } else {
      console.log('⚠️ Nenhum vínculo global encontrado.');
    }
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
fixAdmXyz();
