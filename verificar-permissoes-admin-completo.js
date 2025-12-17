const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function verificarPermissoesAdmin() {
  try {
    console.log('🔍 VERIFICAÇÃO COMPLETA: Permissões do Admin...\n');

    // 1. Verificar se admin tem perfil correto
    console.log('1️⃣ Verificando perfil do admin:');
    const adminProfile = await pool.query(`
      SELECT 
        u.id, u.username, u.nome,
        ur.id as role_id, ur.name as role_name, ur.level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin'
    `);
    
    if (adminProfile.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!');
      return;
    }
    
    const admin = adminProfile.rows[0];
    console.log(`✅ Admin: ${admin.username} (${admin.nome})`);
    console.log(`✅ Perfil: ${admin.role_name} (ID: ${admin.role_id}, Level: ${admin.level})`);

    // 2. Verificar total de permissões do admin
    console.log('\n2️⃣ Verificando total de permissões do admin:');
    const totalPerms = await pool.query(`
      SELECT 
        COUNT(rp.permission_id) as total_permissoes,
        (SELECT COUNT(*) FROM permissions) as total_disponivel
      FROM user_roles ur
      LEFT JOIN role_permissions rp ON ur.id = rp.role_id
      WHERE ur.id = $1
    `, [admin.role_id]);
    
    console.log(`Permissões do admin: ${totalPerms.rows[0].total_permissoes}/${totalPerms.rows[0].total_disponivel}`);

    // 3. Verificar se admin tem permissões para recursos específicos
    console.log('\n3️⃣ Verificando permissões para recursos específicos:');
    
    const recursosEspecificos = [
      'Funcinalidades do Sistema',
      'Categorias de Funcionalidades',
      'Hierarquia de Perfis', 
      'Gestão de Perfis',
      'Gestão de permissões',
      'Usuários'
    ];

    for (const recurso of recursosEspecificos) {
      const result = await pool.query(`
        SELECT 
          sf.name as funcionalidade,
          COUNT(p.id) as total_permissoes,
          STRING_AGG(p.action, ', ') as acoes
        FROM system_features sf
        LEFT JOIN permissions p ON sf.id = p.feature_id
        LEFT JOIN role_permissions rp ON p.id = rp.permission_id
        LEFT JOIN user_roles ur ON rp.role_id = ur.id
        WHERE sf.name = $1 
          AND sf.is_active = true
          AND ur.id = $2
        GROUP BY sf.id, sf.name
      `, [recurso, admin.role_id]);

      if (result.rows.length > 0) {
        console.log(`✅ ${recurso}: ${result.rows[0].total_permissoes} permissões [${result.rows[0].acoes}]`);
      } else {
        console.log(`❌ ${recurso}: SEM PERMISSÕES`);
      }
    }

    // 4. Verificar se as funcionalidades existem no banco
    console.log('\n4️⃣ Verificando se funcionalidades existem:');
    const funcionalidadesExistem = await pool.query(`
      SELECT name, is_active 
      FROM system_features 
      WHERE name IN ('Funcinalidades do Sistema', 'Categorias de Funcionalidades', 'Hierarquia de Perfis', 'Gestão de Perfis', 'Gestão de permissões', 'Usuários')
      ORDER BY name
    `);

    console.log('Funcionalidades encontradas:');
    funcionalidadesExistem.rows.forEach(row => {
      const status = row.is_active ? '✅' : '❌';
      console.log(`${status} ${row.name} (ativo: ${row.is_active})`);
    });

    // 5. Verificar se as permissões existem para essas funcionalidades
    console.log('\n5️⃣ Verificando se permissões existem para essas funcionalidades:');
    const permissoesExistem = await pool.query(`
      SELECT 
        sf.name as funcionalidade,
        COUNT(p.id) as total_permissoes,
        STRING_AGG(p.action, ', ') as acoes
      FROM system_features sf
      LEFT JOIN permissions p ON sf.id = p.feature_id
      WHERE sf.name IN ('Funcinalidades do Sistema', 'Categorias de Funcionalidades', 'Hierarquia de Perfis', 'Gestão de Perfis', 'Gestão de permissões', 'Usuários')
        AND sf.is_active = true
      GROUP BY sf.id, sf.name
      ORDER BY sf.name
    `);

    console.log('Permissões por funcionalidade:');
    permissoesExistem.rows.forEach(row => {
      console.log(`✅ ${row.funcionalidade}: ${row.total_permissoes} permissões [${row.acoes}]`);
    });

    // 6. Verificar se admin tem essas permissões via role_permissions
    console.log('\n6️⃣ Verificando se admin tem essas permissões via role_permissions:');
    const adminTemPermissoes = await pool.query(`
      SELECT 
        sf.name as funcionalidade,
        COUNT(rp.permission_id) as permissoes_do_admin,
        COUNT(p.id) as total_permissoes,
        STRING_AGG(p.action, ', ') as acoes_do_admin
      FROM system_features sf
      LEFT JOIN permissions p ON sf.id = p.feature_id
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = $1
      WHERE sf.name IN ('Funcinalidades do Sistema', 'Categorias de Funcionalidades', 'Hierarquia de Perfis', 'Gestão de Perfis', 'Gestão de permissões', 'Usuários')
        AND sf.is_active = true
      GROUP BY sf.id, sf.name
      ORDER BY sf.name
    `, [admin.role_id]);

    console.log('Permissões do admin por funcionalidade:');
    adminTemPermissoes.rows.forEach(row => {
      const status = row.permissoes_do_admin === row.total_permissoes ? '✅' : '❌';
      console.log(`${status} ${row.funcionalidade}: ${row.permissoes_do_admin}/${row.total_permissoes} [${row.acoes_do_admin || 'NENHUMA'}]`);
    });

    // 7. Se faltam permissões, mostrar como corrigir
    const faltamPermissoes = adminTemPermissoes.rows.filter(row => row.permissoes_do_admin < row.total_permissoes);
    
    if (faltamPermissoes.length > 0) {
      console.log('\n🚨 CORREÇÃO NECESSÁRIA:');
      console.log('Execute este comando no pgAdmin4 para corrigir:');
      console.log('');
      console.log('INSERT INTO role_permissions (role_id, permission_id)');
      console.log('SELECT');
      console.log(`  ${admin.role_id} as role_id,`);
      console.log('  p.id as permission_id');
      console.log('FROM permissions p');
      console.log('JOIN system_features sf ON p.feature_id = sf.id');
      console.log(`WHERE sf.name IN ('Funcinalidades do Sistema', 'Categorias de Funcionalidades', 'Hierarquia de Perfis', 'Gestão de Perfis', 'Gestão de permissões', 'Usuários')`);
      console.log(`  AND sf.is_active = true`);
      console.log(`  AND p.id NOT IN (`);
      console.log(`    SELECT rp.permission_id FROM role_permissions rp WHERE rp.role_id = ${admin.role_id}`);
      console.log(`  )`);
      console.log(`ON CONFLICT (role_id, permission_id) DO NOTHING;`);
    } else {
      console.log('\n✅ Todas as permissões estão corretas!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarPermissoesAdmin();
