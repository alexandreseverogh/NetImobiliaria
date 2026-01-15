const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function main() {
    try {
        console.log('Criando dados de teste...');

        // Buscar IDs válidos
        const tipoRes = await pool.query('SELECT id FROM tipos_imovel LIMIT 1');
        const finRes = await pool.query('SELECT id FROM finalidades_imovel LIMIT 1');
        const statRes = await pool.query('SELECT id FROM status_imovel LIMIT 1');
        const userRes = await pool.query('SELECT id FROM users WHERE ativo = true LIMIT 1');

        if (!tipoRes.rows.length || !finRes.rows.length || !statRes.rows.length || !userRes.rows.length) {
            console.log('❌ Banco de dados faltando tipos/finalidades/status/usuários básicos.');
            return;
        }
        const tipoId = tipoRes.rows[0].id;
        const finId = finRes.rows[0].id;
        const statId = statRes.rows[0].id;
        const userId = userRes.rows[0].id; // Corretor FK (se usasse)

        console.log(`Usando Tipo: ${tipoId}, Finalidade: ${finId}, Status: ${statId}, User: ${userId}`);

        // 1. Criar Proprietário
        const propUuid = '11111111-1111-1111-1111-111111111111';
        await pool.query(`
      INSERT INTO proprietarios (uuid, nome, email, telefone, cpf, endereco)
      VALUES ($1, 'Proprietário Teste', 'prop@teste.com', '11999999999', '12345678900', 'Rua Prop, 1')
      ON CONFLICT (uuid) DO UPDATE SET nome = 'Proprietário Teste'
    `, [propUuid]);

        // 2. Criar Imóvel vinculado
        const imovelId = 999999;
        await pool.query(`
      INSERT INTO imoveis (id, codigo, titulo, proprietario_uuid, ativo, status_fk, tipo_fk, finalidade_fk)
      VALUES ($1, 'COD999999', 'Casa Teste 2', $2, true, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET 
        proprietario_uuid = $2, ativo = true, status_fk = $3, tipo_fk = $4, finalidade_fk = $5
    `, [imovelId, propUuid, statId, tipoId, finId]);

        // 3. Criar Cliente
        const cliUuid = '22222222-2222-2222-2222-222222222222';
        await pool.query(`
      INSERT INTO clientes (uuid, nome, email, cpf, telefone)
      VALUES ($1, 'Cliente Teste', 'cli@teste.com', '11122233344', '11988887777')
      ON CONFLICT (uuid) DO NOTHING
    `, [cliUuid]);

        // 4. Criar Prospect
        // created_by aponta para cliente? Vamos tentar. Se falhar, é outro FK.
        // Mas o erro anterior disse que FK created_by aponta para clientes.
        await pool.query(`
      INSERT INTO imovel_prospects (id_cliente, id_imovel, created_at, created_by)
      VALUES ($1, $2, NOW(), $3)
      RETURNING id
    `, [cliUuid, imovelId, cliUuid]);
        const prospectId = prospectRes.rows[0].id;
        console.log('Prospect criado:', prospectId);

        // 5. Executar a Query SEM corretor_fk (para validar o FETCH do proprietário apenas)
        const query = `
    SELECT
      ip.id as prospect_id,
      ip.created_at as data_interesse,
      ip.preferencia_contato,
      ip.mensagem,
      i.id as imovel_id,
      -- i.corretor_fk,  <-- Removido
      i.codigo,
      i.titulo,
      pr.nome as proprietario_nome,
      pr.cpf as proprietario_cpf,
      pr.telefone as proprietario_telefone,
      pr.email as proprietario_email,
      pr.endereco as proprietario_endereco,
      c.nome as cliente_nome
    FROM imovel_prospects ip
    INNER JOIN imoveis i ON ip.id_imovel = i.id
    LEFT JOIN proprietarios pr ON pr.uuid = i.proprietario_uuid
    LEFT JOIN clientes c ON ip.id_cliente = c.uuid
    WHERE ip.id = $1
    `;

        const res = await pool.query(query, [prospectId]);
        const row = res.rows[0];

        console.log('--- RESULTADO DA QUERY DO ROUTER ---');
        console.log('Proprietário Nome:', row.proprietario_nome);
        console.log('Proprietário Email:', row.proprietario_email);
        console.log('Cliente Nome:', row.cliente_nome);

        if (row.proprietario_nome === 'Proprietário Teste' && row.proprietario_email === 'prop@teste.com') {
            console.log('✅ SUCESSO: A query recuperou os dados do proprietário corretamente.');
        } else {
            console.log('❌ FALHA: A query NÃO trouxe os dados do proprietário.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

main();
