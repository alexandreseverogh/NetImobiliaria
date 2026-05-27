const { Client } = require('pg');

async function upgradeDatabase() {
    const client = new Client({
        host: '127.0.0.1',
        port: 15432,
        user: 'postgres',
        password: 'postgres',
        database: 'net_imobiliaria'
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        console.log('🛠️ Adicionando coluna semantic_mapping (JSONB) em system_features...');
        await client.query(`
            ALTER TABLE system_features 
            ADD COLUMN IF NOT EXISTS semantic_mapping JSONB DEFAULT '[]'::jsonb
        `);

        console.log('🎯 Criando o mapeamento inicial para Proprietários...');
        // Recuperamos a tag criada anteriormente
        const tagRes = await client.query("SELECT tag_key FROM system_role_tags WHERE tag_key = 'REAL_ESTATE_BROKER'");
        const tagKey = tagRes.rows[0]?.tag_key || 'REAL_ESTATE_BROKER';

        const mapping = JSON.stringify([
            { 
                field: 'corretor_fk', 
                tag: tagKey, 
                label: 'Corretor Responsável',
                required: true 
            }
        ]);

        await client.query(`
            UPDATE system_features 
            SET semantic_mapping = $1 
            WHERE url LIKE '%proprietarios%' OR slug = 'proprietarios'
        `, [mapping]);

        await client.query('COMMIT');
        console.log('✅ Banco de Dados atualizado com sucesso.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', err);
    } finally {
        await client.end();
    }
}

upgradeDatabase();
