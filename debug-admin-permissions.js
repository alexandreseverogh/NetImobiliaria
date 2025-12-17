const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function debugAdminPermissions() {
  try {
    console.log('🔍 DEBUG: Verificando permissões do admin...\n');

    // 1. Verificar se existe usuário admin
    console.log('1️⃣ Verificando usuário admin:');
    const result1 = await pool.query(`
      SELECT u.id, u.username, u.nome, ur.name as role_name
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin' OR u.nome ILIKE '%admin%'
    `);
    
    if (result1.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!');
      return;
    }
    
    const adminUser = result1.rows[0];
    console.log(`✅ Usuário encontrado: ${adminUser.username} (${adminUser.nome}) - Perfil: ${adminUser.role_name}`);

    // 2. Verificar permissões do admin
    console.log('\n2️⃣ Verificando permissões do admin:');
    const result2 = await pool.query(`
      SELECT 
        COUNT(rp.permission_id) as total_permissoes,
        (SELECT COUNT(*) FROM permissions) as total_disponivel
      FROM user_roles ur
      LEFT JOIN role_permissions rp ON ur.id = rp.role_id
      WHERE ur.name = $1
    `, [adminUser.role_name]);
    
    console.log(`Permissões do admin: ${result2.rows[0].total_permissoes}/${result2.rows[0].total_disponivel}`);

    // 3. Verificar funcionalidades disponíveis
    console.log('\n3️⃣ Verificando funcionalidades disponíveis:');
    const result3 = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
        sf.category_id,
        sf.url,
        sf.is_active,
        COUNT(p.id) as total_permissoes,
        STRING_AGG(p.action, ', ') as acoes
      FROM system_features sf
      LEFT JOIN permissions p ON sf.id = p.feature_id
      WHERE sf.is_active = true
      GROUP BY sf.id, sf.name, sf.category_id, sf.url, sf.is_active
      ORDER BY sf.category_id, sf.name
    `);
    
    console.log('Funcionalidades disponíveis:');
    result3.rows.forEach(row => {
      console.log(`- ${row.name} (category_id: ${row.category_id}): ${row.total_permissoes} permissões [${row.acoes}]`);
    });

    // 4. Verificar permissões específicas do admin por funcionalidade
    console.log('\n4️⃣ Verificando permissões específicas do admin:');
    const result4 = await pool.query(`
      SELECT 
        sf.name as funcionalidade,
        sf.category_id,
        COUNT(p.id) as permissoes_disponiveis,
        COUNT(rp.permission_id) as permissoes_do_admin,
        STRING_AGG(p.action, ', ') as acoes_disponiveis,
        STRING_AGG(CASE WHEN rp.permission_id IS NOT NULL THEN p.action END, ', ') as acoes_do_admin
      FROM system_features sf
      LEFT JOIN permissions p ON sf.id = p.feature_id
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN user_roles ur ON rp.role_id = ur.id
      WHERE sf.is_active = true AND ur.name = $1
      GROUP BY sf.id, sf.name, sf.category_id
      ORDER BY sf.category_id, sf.name
    `, [adminUser.role_name]);
    
    console.log('Permissões do admin por funcionalidade:');
    result4.rows.forEach(row => {
      const status = row.permissoes_do_admin === row.permissoes_disponiveis ? '✅' : '❌';
      console.log(`${status} ${row.funcionalidade}: ${row.permissoes_do_admin}/${row.permissoes_disponiveis} [${row.acoes_do_admin || 'NENHUMA'}]`);
    });

    // 5. Verificar mapeamento de categorias
    console.log('\n5️⃣ Verificando mapeamento de categorias:');
    const result5 = await pool.query(`
      SELECT DISTINCT sf.category_id, sc.slug, sc.name as category_name
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.is_active = true 
      ORDER BY sf.category_id
    `);
    
    console.log('Categorias disponíveis:');
    result5.rows.forEach(row => {
      console.log(`- ID: ${row.category_id}, Slug: ${row.slug || 'NULL'}, Name: ${row.category_name || 'NULL'}`);
    });

    // 6. Verificar se há funcionalidades sem permissões
    console.log('\n6️⃣ Verificando funcionalidades sem permissões:');
    const result6 = await pool.query(`
      SELECT sf.name, sf.category_id, sf.url
      FROM system_features sf
      LEFT JOIN permissions p ON sf.id = p.feature_id
      WHERE sf.is_active = true AND p.id IS NULL
    `);
    
    if (result6.rows.length === 0) {
      console.log('✅ Todas as funcionalidades têm permissões');
    } else {
      console.log('❌ Funcionalidades sem permissões:');
      result6.rows.forEach(row => {
        console.log(`- ${row.name} (category_id: ${row.category_id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

debugAdminPermissions();
