const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function grantPermission() {
    try {
        console.log('🔧 Concedendo permissão READ em status-imoveis para Corretor...\n');

        // 1. Buscar feature status-imoveis
        const featureRes = await pool.query(
            "SELECT id FROM system_features WHERE slug = 'status-imoveis'"
        );

        if (featureRes.rows.length === 0) {
            console.log('❌ Feature "status-imoveis" não encontrada!');
            return;
        }

        const featureId = featureRes.rows[0].id;
        console.log(`✅ Feature encontrada: status-imoveis (ID: ${featureId})`);

        // 2. Buscar permissão READ para essa feature
        const permRes = await pool.query(
            "SELECT id FROM permissions WHERE feature_id = $1 AND action = 'read'",
            [featureId]
        );

        if (permRes.rows.length === 0) {
            console.log('❌ Permissão READ não encontrada para status-imoveis!');
            return;
        }

        const permissionId = permRes.rows[0].id;
        console.log(`✅ Permissão encontrada: READ (ID: ${permissionId})`);

        // 3. Buscar role Corretor
        const roleRes = await pool.query(
            "SELECT id FROM user_roles WHERE name = 'Corretor'"
        );

        if (roleRes.rows.length === 0) {
            console.log('❌ Role "Corretor" não encontrada!');
            return;
        }

        const roleId = roleRes.rows[0].id;
        console.log(`✅ Role encontrada: Corretor (ID: ${roleId})`);

        // 4. Verificar se já existe em role_permissions
        const existingRes = await pool.query(
            'SELECT * FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
            [roleId, permissionId]
        );

        if (existingRes.rows.length > 0) {
            console.log('✅ Permissão já está atribuída ao role!');
            return;
        }

        // 5. Inserir em role_permissions
        await pool.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, permissionId]
        );

        console.log('✅ Permissão concedida com sucesso!');
        console.log(`   Role: Corretor (${roleId})`);
        console.log(`   Permission: READ status-imoveis (${permissionId})`);

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await pool.end();
    }
}

grantPermission();
