const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432')
};

async function fixPermissions() {
    console.log('🚀 Iniciando correção de permissões para Corretor...');
    const pool = new Pool(dbConfig);

    try {
        // 1. Encontrar feature 'status-imoveis'
        const featureRes = await pool.query("SELECT id, name FROM system_features WHERE slug = 'status-imoveis'");
        if (featureRes.rows.length === 0) {
            throw new Error("Feature 'status-imoveis' não encontrada!");
        }
        const featureId = featureRes.rows[0].id;
        console.log(`✅ Feature encontrada: ${featureRes.rows[0].name} (ID: ${featureId})`);

        // 2. Encontrar permissão READ
        const permRes = await pool.query("SELECT id FROM permissions WHERE feature_id = $1 AND action = 'READ'", [featureId]);
        if (permRes.rows.length === 0) {
            console.log('⚠️ Permissão READ não encontrada para esta feature. Criando...');
            const newPerm = await pool.query("INSERT INTO permissions (feature_id, action, description) VALUES ($1, 'READ', 'Leitura de Status de Imóvel') RETURNING id", [featureId]);
            var permissionId = newPerm.rows[0].id;
        } else {
            var permissionId = permRes.rows[0].id;
        }
        console.log(`✅ Permissão READ ID: ${permissionId}`);

        // 3. Encontrar Role 'Corretor'
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'Corretor'");
        if (roleRes.rows.length === 0) {
            throw new Error("Role 'Corretor' não encontrada!");
        }
        const roleId = roleRes.rows[0].id;
        console.log(`✅ Role 'Corretor' encontrada (ID: ${roleId})`);

        // 4. Atribuir permissão
        const checkAssign = await pool.query("SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2", [roleId, permissionId]);
        if (checkAssign.rows.length === 0) {
            await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)", [roleId, permissionId]);
            console.log('🎉 Permissão atribuída com sucesso!');
        } else {
            console.log('ℹ️ Permissão já existe para este perfil.');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

fixPermissions();
