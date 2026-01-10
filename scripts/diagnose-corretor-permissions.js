const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.DB_PORT || '5432')
};

async function diagnose() {
    console.log('🚀 Iniciando diagnóstico de permissões do Corretor...');
    const pool = new Pool(dbConfig);

    try {
        // 0. Verificar conexao
        const dbInfo = await pool.query('SELECT current_database(), current_user, current_schema()');
        console.log('📍 Conectado em:', dbInfo.rows[0]);

        // 1. Obter ID da Role Corretor
        const roleRes = await pool.query("SELECT id FROM user_roles WHERE name = 'Corretor'");
        if (roleRes.rows.length === 0) {
            console.log("❌ Role 'Corretor' não encontrada!");
            return;
        }
        const roleId = roleRes.rows[0].id;
        console.log(`✅ Role 'Corretor' encontrada: ID ${roleId}`);

        // 2. Listar todas as permissões
        // ORDER BY p.action DESC -> assumes action is string, maybe not ideal sort but ok
        const permsRes = await pool.query(`
      SELECT 
        sf.name as feature_name, 
        sf.slug as feature_slug, 
        p.action, 
        p.id as permission_id
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE rp.role_id = $1
      ORDER BY sf.slug, p.action 
    `, [roleId]);

        console.log('\n📊 Permissões atuais do Corretor (Raw):');
        if (permsRes.rows.length === 0) {
            console.log('   (Nenhuma permissão encontrada)');
        } else {
            permsRes.rows.forEach(p => {
                console.log(`   - ${p.feature_name} (${p.feature_slug}): ${p.action}`);
            });
        }

        // 3. Verificar especificamente Imóveis e Features relacionadas
        console.log('\n🔍 Verificando features críticas:');
        const featuresToCheck = ['imoveis', 'status-imoveis', 'tipos-imoveis', 'proprietarios'];
        for (const slug of featuresToCheck) {
            const featRes = await pool.query("SELECT id FROM system_features WHERE slug = $1", [slug]);
            if (featRes.rows.length > 0) {

                // Verificar permissões que eu tenho
                const myPerms = permsRes.rows
                    .filter(p => p.feature_slug === slug)
                    .map(p => p.action);

                console.log(`   Feature '${slug}': [${myPerms.join(', ')}]`);

                if (slug === 'imoveis') {
                    const hasWrite = myPerms.includes('write') || myPerms.includes('update') || myPerms.includes('create');
                    console.log(`      > Permissão de ESCRITA: ${hasWrite ? '✅ OK' : '❌ FALTANDO'}`);
                }
            } else {
                console.log(`   Feature '${slug}' não existe no sistema!`);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

diagnose();
