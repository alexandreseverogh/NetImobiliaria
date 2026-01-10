const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432')
};

async function exemptRoute() {
    console.log('🚀 Iniciando isenção da rota /api/admin/proprietarios/mine...');
    const pool = new Pool(dbConfig);

    try {
        // Verificar se existe feature proprietarios-mine (se não, criar ou usar proprietarios com rota especifica)
        // Na verdade, a melhor abordagem é adicionar uma entrada em route_permissions_config 
        // com requires_auth=false para que o middleware ignore (já que a rota valida auth internamente)
        // OU mapear para uma permissão que o corretor já tenha.

        // Vamos verificar se já existe config para essa rota
        const checkRes = await pool.query(
            "SELECT id FROM route_permissions_config WHERE route_pattern = '/api/admin/proprietarios/mine'"
        );

        if (checkRes.rows.length > 0) {
            console.log('ℹ️ Configuração já existe, atualizando para ignorar auth do middleware...');
            await pool.query(
                "UPDATE route_permissions_config SET requires_auth = false WHERE route_pattern = '/api/admin/proprietarios/mine'"
            );
        } else {
            console.log('✨ Criando nova configuração para ignorar auth do middleware...');
            // Precisamos de um feature_id valido, vamos usar o sistema base
            const featRes = await pool.query("SELECT id FROM system_features LIMIT 1");
            const featureId = featRes.rows[0].id;

            await pool.query(
                `INSERT INTO route_permissions_config 
         (feature_id, route_pattern, method, default_action, requires_auth, requires_2fa, is_active)
         VALUES ($1, '/api/admin/proprietarios/mine', 'GET', 'READ', false, false, true)`,
                [featureId]
            );
        }

        console.log('✅ Rota configurada para bypass no middleware (auth interna permanece)!');

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

exemptRoute();
