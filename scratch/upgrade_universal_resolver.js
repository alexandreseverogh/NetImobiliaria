const { Client } = require('pg');

async function upgradeToUniversalDataResolver() {
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

        console.log('🛠️ Evoluindo system_role_tags para Provedor Universal...');
        await client.query(`
            ALTER TABLE system_role_tags 
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'USER_ROLE',
            ADD COLUMN IF NOT EXISTS source_table VARCHAR(100),
            ADD COLUMN IF NOT EXISTS id_column VARCHAR(50) DEFAULT 'id',
            ADD COLUMN IF NOT EXISTS label_column VARCHAR(100) DEFAULT 'nome',
            ADD COLUMN IF NOT EXISTS filter_column VARCHAR(100),
            ADD COLUMN IF NOT EXISTS filter_value VARCHAR(100)
        `);

        console.log('🎯 Configurando a tag REAL_ESTATE_BROKER no novo modelo...');
        // O modelo USER_ROLE é o que já vínhamos usando (faz o JOIN com as roles)
        await client.query(`
            UPDATE system_role_tags 
            SET source_type = 'USER_ROLE',
                source_table = 'users',
                id_column = 'id',
                label_column = 'nome'
            WHERE tag_key = 'REAL_ESTATE_BROKER'
        `);

        await client.query('COMMIT');
        console.log('✅ Infraestrutura de Provedor Universal de Dados instalada.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na evolução:', err);
    } finally {
        await client.end();
    }
}

upgradeToUniversalDataResolver();
