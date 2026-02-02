const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 15432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'postgres'
});

async function createTestLead() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get cliente UUID (same for id_cliente and created_by)
    const clienteResult = await client.query("SELECT uuid FROM clientes LIMIT 1");
    const clienteUuid = clienteResult.rows[0].uuid;
    console.log(`✅ Cliente UUID: ${clienteUuid}`);

    // Get External broker from PE/Recife
    const brokerResult = await client.query(`
      SELECT u.id, u.nome, u.tipo_corretor
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE ur.name = 'Corretor'
        AND u.ativo = true
        AND COALESCE(u.is_plantonista, false) = false
        AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo'
        AND caa.estado_fk = 'PE'
        AND caa.cidade_fk = 'Recife'
      LIMIT 1
    `);

    if (brokerResult.rows.length === 0) {
      console.error('❌ No External broker found');
      await client.query('ROLLBACK');
      return;
    }

    const broker = brokerResult.rows[0];
    console.log(`✅ Broker: ${broker.nome} (${broker.tipo_corretor})`);

    // Create prospect
    const prospectResult = await client.query(`
      INSERT INTO imovel_prospects (id_cliente, id_imovel, created_by, preferencia_contato, mensagem)
      VALUES ($1, 145, $1, 'email', 'Test lead - expires in 1 min')
      RETURNING id
    `, [clienteUuid]);

    const prospectId = prospectResult.rows[0].id;
    console.log(`✅ Prospect ID: ${prospectId}`);

    // Create assignment expiring in 1 minute
    const expiraEm = new Date(Date.now() + 60 * 1000);

    await client.query(`
      INSERT INTO imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
      VALUES ($1, $2, 'atribuido', $3, $4)
    `, [
      prospectId,
      broker.id,
      JSON.stringify({ type: 'area_match', source: 'test_manual' }),
      expiraEm
    ]);

    await client.query('COMMIT');

    console.log(`\n✅ TEST LEAD CREATED!`);
    console.log(`   Prospect ID: ${prospectId}`);
    console.log(`   Broker: ${broker.nome} (External)`);
    console.log(`   Expires at: ${expiraEm.toLocaleTimeString('pt-BR')}`);
    console.log(`\n📊 Watch the monitor - Lead will expire in 1 minute!\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestLead();
