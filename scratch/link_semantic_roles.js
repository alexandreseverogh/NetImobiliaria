const { Client } = require('pg');

async function linkExistingRoles() {
    const client = new Client({
        host: '127.0.0.1',
        port: 15432,
        user: 'postgres',
        password: 'postgres',
        database: 'net_imobiliaria'
    });

    try {
        await client.connect();
        
        console.log('🔍 Buscando ID da Tag REAL_ESTATE_BROKER...');
        const tagRes = await client.query("SELECT id FROM system_role_tags WHERE tag_key = 'REAL_ESTATE_BROKER'");
        if (tagRes.rows.length === 0) throw new Error('Tag não encontrada');
        const tagId = tagRes.rows[0].id;

        console.log('🔗 Vinculando perfis existentes que se comportam como corretores...');
        const updateRes = await client.query(`
            UPDATE user_roles 
            SET system_tag_id = $1 
            WHERE (name ILIKE '%corretor%' OR name ILIKE '%broker%')
            AND system_tag_id IS NULL
        `, [tagId]);

        console.log(`✅ ${updateRes.rowCount} perfis foram vinculados semanticamente à tag REAL_ESTATE_BROKER.`);
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await client.end();
    }
}

linkExistingRoles();
