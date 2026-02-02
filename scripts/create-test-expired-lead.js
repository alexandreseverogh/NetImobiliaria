const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function run() {
    try {
        console.log('1. Creating test client...');
        const clientRes = await pool.query(
            `INSERT INTO clientes (nome, email, telefone, cpf, created_at) 
             VALUES ('Tester Email Rico 5', 'tester_rico5@example.com', '11988887770', '12345678905', NOW()) 
             RETURNING uuid`
        );
        const clientUuid = clientRes.rows[0].uuid;
        console.log(`Created client UUID: ${clientUuid}`);

        console.log('2. Creating test prospect for property 145...');
        const prospectRes = await pool.query(
            `INSERT INTO imovel_prospects (id_imovel, id_cliente, created_by, mensagem, created_at) 
             VALUES (145, $1, $1, 'Teste de e-mail com dados do imóvel 5', NOW()) 
             RETURNING id`,
            [clientUuid]
        );
        const prospectId = prospectRes.rows[0].id;
        console.log(`Created prospect ID: ${prospectId}`);

        // 3. Find a broker (e.g., Maria Silva)
        const brokerRes = await pool.query("SELECT id FROM users WHERE nome = 'Maria Silva' LIMIT 1");
        const brokerId = brokerRes.rows[0].id;

        // 4. Create assignment already expired
        console.log(`3. Creating EXPIRED assignment for broker ${brokerId}...`);
        await pool.query(
            `INSERT INTO imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, expira_em, created_at)
             VALUES ($1, $2, 'atribuido', NOW() - INTERVAL '1 hour', NOW())`,
            [prospectId, brokerId]
        );

        console.log('✅ Test setup complete! Now trigger the transbordo API.');

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
