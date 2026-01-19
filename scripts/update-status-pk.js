require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function migrateStatusId() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar se status 48 existe
        const check48 = await client.query('SELECT * FROM status_imovel WHERE id = 48');
        if (check48.rows.length === 0) {
            throw new Error('Status ID 48 não encontrado para migração.');
        }
        const statusData = check48.rows[0];
        console.log('✅ Status 48 encontrado:', statusData.nome);

        // 2. Renomear status 48 temporariamente para liberar Constraint UNIQUE
        console.log('🔄 Renomeando Status 48 temporariamente...');
        await client.query('UPDATE status_imovel SET nome = $1 WHERE id = 48', [statusData.nome + '_TEMP_MIGRATION']);

        // 3. Criar Status 100 igual ao original (com nome correto)
        console.log('📝 Criando Status 100...');
        try {
            await client.query(`
        INSERT INTO status_imovel (id, nome, cor, descricao, ativo, consulta_imovel_internauta)
        VALUES (100, $1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [statusData.nome, statusData.cor, statusData.descricao, statusData.ativo, statusData.consulta_imovel_internauta]);
        } catch (insertError) {
            // Se falhar, restaurar nome original antes de erro
            console.error('Falha ao inserir 100, restaurando...');
            await client.query('ROLLBACK');
            throw insertError;
        }

        // 4. Migrar imóveis que usam 48 para 100
        const updateRes = await client.query('UPDATE imoveis SET status_fk = 100 WHERE status_fk = 48');
        console.log(`🔄 Referências em imoveis atualizadas: ${updateRes.rowCount} registros.`);

        // 5. Apagar Status 48 (agora chamado X_TEMP)
        await client.query('DELETE FROM status_imovel WHERE id = 48');
        console.log('🗑️ Status 48 removido.');

        await client.query('COMMIT');
        console.log('✅ Migração de ID 48 -> 100 concluída com sucesso!');

    } catch (err) {
        if (client) { // Check if client still valid
            try { await client.query('ROLLBACK'); } catch (e) { }
        }
        console.error('❌ Erro na migração:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

migrateStatusId();
