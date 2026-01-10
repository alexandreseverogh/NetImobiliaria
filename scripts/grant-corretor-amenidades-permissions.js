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

async function grantPermissions() {
    try {
        console.log('🔧 Concedendo permissões para Corretor...\n');

        // Features que o Corretor precisa acessar
        const features = [
            'categorias-amenidades',
            'amenidades',
            'categorias-proximidades',
            'proximidades'
        ];

        // 1. Buscar role Corretor
        const roleRes = await pool.query(
            "SELECT id FROM user_roles WHERE name = 'Corretor'"
        );

        if (roleRes.rows.length === 0) {
            console.log('❌ Role "Corretor" não encontrada!');
            return;
        }

        const roleId = roleRes.rows[0].id;
        console.log(`✅ Role encontrada: Corretor (ID: ${roleId})\n`);

        // 2. Para cada feature, conceder permissão READ
        for (const featureSlug of features) {
            console.log(`📋 Processando: ${featureSlug}`);

            // Buscar feature
            const featureRes = await pool.query(
                "SELECT id FROM system_features WHERE slug = $1",
                [featureSlug]
            );

            if (featureRes.rows.length === 0) {
                console.log(`   ⚠️  Feature "${featureSlug}" não encontrada, pulando...`);
                continue;
            }

            const featureId = featureRes.rows[0].id;

            // Buscar permissão READ
            const permRes = await pool.query(
                "SELECT id FROM permissions WHERE feature_id = $1 AND action = 'read'",
                [featureId]
            );

            if (permRes.rows.length === 0) {
                console.log(`   ⚠️  Permissão READ não encontrada para ${featureSlug}, pulando...`);
                continue;
            }

            const permissionId = permRes.rows[0].id;

            // Verificar se já existe
            const existingRes = await pool.query(
                'SELECT * FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
                [roleId, permissionId]
            );

            if (existingRes.rows.length > 0) {
                console.log(`   ✅ Já existe`);
            } else {
                // Inserir
                await pool.query(
                    'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                    [roleId, permissionId]
                );
                console.log(`   ✅ Concedida!`);
            }
        }

        console.log('\n✅ Processo concluído!');

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await pool.end();
    }
}

grantPermissions();
