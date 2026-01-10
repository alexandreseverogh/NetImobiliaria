const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.DB_PORT || '5432')
};

async function fixPermissions() {
    console.log('🚀 Iniciando correção de permissões do Corretor...');
    const pool = new Pool(dbConfig);

    try {
        // 1. Obter ID da Role Corretor
        const roleRes = await pool.query("SELECT id FROM user_roles WHERE name = 'Corretor'");
        if (roleRes.rows.length === 0) {
            console.log("❌ Role 'Corretor' não encontrada!");
            return;
        }
        const roleId = roleRes.rows[0].id;
        console.log(`✅ Role 'Corretor' encontrada: ID ${roleId}`);

        // Lista de permissões a conceder
        const permissionsToGrant = [
            { feature: 'imoveis', actions: ['create', 'update', 'read', 'list', 'delete'] }, // Delete talvez? Melhor dar tudo de imoveis
            { feature: 'status-imoveis', actions: ['read', 'list'] },
            { feature: 'tipos-imoveis', actions: ['read', 'list'] },
            { feature: 'proprietarios', actions: ['create', 'read', 'list', 'update'] },
            { feature: 'clientes', actions: ['create', 'read', 'list', 'update'] },
            { feature: 'dashboard', actions: ['read', 'list', 'execute'] }
        ];

        for (const item of permissionsToGrant) {
            console.log(`\n🔹 Processando feature: ${item.feature}`);

            // Buscar Feature ID
            const featRes = await pool.query("SELECT id FROM system_features WHERE slug = $1", [item.feature]);
            if (featRes.rows.length === 0) {
                console.log(`   ⚠️ Feature '${item.feature}' não encontrada. Pulando...`);
                continue;
            }
            const featureId = featRes.rows[0].id;

            for (const action of item.actions) {
                // 1. Garantir que a permissão existe na tabela permissions
                let permId;
                const checkPerm = await pool.query(
                    "SELECT id FROM permissions WHERE feature_id = $1 AND action = $2",
                    [featureId, action]
                );

                if (checkPerm.rows.length > 0) {
                    permId = checkPerm.rows[0].id;
                } else {
                    console.log(`   ➕ Criando permissão '${action}' para '${item.feature}'...`);
                    const newPerm = await pool.query(
                        "INSERT INTO permissions (feature_id, action, description) VALUES ($1, $2, $3) RETURNING id",
                        [featureId, action, `Permissão ${action} para ${item.feature}`]
                    );
                    permId = newPerm.rows[0].id;
                }

                // 2. Atribuir ao Corretor
                const checkAssign = await pool.query(
                    "SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2",
                    [roleId, permId]
                );

                if (checkAssign.rows.length === 0) {
                    await pool.query(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)",
                        [roleId, permId]
                    );
                    console.log(`   ✅ Concedido: ${action}`);
                } else {
                    console.log(`   ℹ️  Já possui: ${action}`);
                }
            }
        }

        console.log('\n🎉 Processo concluído!');

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

fixPermissions();
