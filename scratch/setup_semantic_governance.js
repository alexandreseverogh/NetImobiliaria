const { Client } = require('pg');

async function setupSemanticGovernance() {
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

        console.log('🛠️ Criando tabela de Tags Sistêmicas...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_role_tags (
                id SERIAL PRIMARY KEY,
                tag_key VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                module_id INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('🛠️ Adicionando coluna system_tag_id em user_roles...');
        await client.query(`
            ALTER TABLE user_roles 
            ADD COLUMN IF NOT EXISTS system_tag_id INTEGER REFERENCES system_role_tags(id)
        `);

        console.log('🛠️ Adicionando coluna filter_role_tag_id em system_features...');
        await client.query(`
            ALTER TABLE system_features 
            ADD COLUMN IF NOT EXISTS filter_role_tag_id INTEGER REFERENCES system_role_tags(id)
        `);

        console.log('🌱 Inserindo Tag Inicial: REAL_ESTATE_BROKER...');
        const tagResult = await client.query(`
            INSERT INTO system_role_tags (tag_key, display_name, description)
            VALUES ('REAL_ESTATE_BROKER', 'Corretor de Imóveis', 'Profissional responsável pela intermediação imobiliária')
            ON CONFLICT (tag_key) DO UPDATE SET display_name = EXCLUDED.display_name
            RETURNING id
        `);
        const brokerTagId = tagResult.rows[0].id;

        console.log('🔗 Vinculando a tag ao módulo Imobiliário (assumindo ID 2 ou similar, vamos buscar)...');
        const moduleRes = await client.query("SELECT id FROM system_modules WHERE name ILIKE '%imobiliario%' OR name ILIKE '%real estate%' LIMIT 1");
        if (moduleRes.rows.length > 0) {
            await client.query("UPDATE system_role_tags SET module_id = $1 WHERE id = $2", [moduleRes.rows[0].id, brokerTagId]);
        }

        console.log('🎯 Configurando Metadado na Funcionalidade de Proprietários...');
        // Buscamos a funcionalidade pelo slug ou url para evitar hardcoding de ID
        await client.query(`
            UPDATE system_features 
            SET filter_role_tag_id = $1 
            WHERE url LIKE '%proprietarios%' OR slug = 'proprietarios'
        `, [brokerTagId]);

        await client.query('COMMIT');
        console.log('✅ Infraestrutura de Governança Semântica instalada com sucesso.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro no setup:', err);
    } finally {
        await client.end();
    }
}

setupSemanticGovernance();
