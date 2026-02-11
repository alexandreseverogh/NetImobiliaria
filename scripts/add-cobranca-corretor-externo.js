const { Pool } = require('pg');

// Usando as credenciais descobertas no .env.local e a senha fornecida pelo usuário
const connectionString = 'postgres://postgres:Roberto@2007@localhost:15432/net_imobiliaria';

console.log('Conectando ao banco...');

const pool = new Pool({
    connectionString: connectionString,
});

async function run() {
    try {
        console.log('Verificando tabela parametros...');

        // Verificar se a coluna já existe
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='parametros' AND column_name='cobranca_corretor_externo';
    `);

        if (res.rows.length === 0) {
            console.log('Adicionando coluna cobranca_corretor_externo...');
            await pool.query(`
        ALTER TABLE parametros 
        ADD COLUMN cobranca_corretor_externo BOOLEAN DEFAULT FALSE;
      `);
            console.log('Coluna adicionada com sucesso.');
        } else {
            console.log('Coluna cobranca_corretor_externo já existe no banco correto.');
        }

    } catch (err) {
        console.error('Erro ao acessar banco de dados:', err);
    } finally {
        await pool.end();
    }
}

run();
