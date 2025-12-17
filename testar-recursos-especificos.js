const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarRecursosEspecificos() {
  try {
    console.log('🔍 Testando recursos específicos do admin...\n');

    // Buscar permissões do admin para os recursos específicos mencionados
    const recursosTestados = [
      'Funcinalidades do Sistema',
      'Categorias de Funcionalidades', 
      'Hierarquia de Perfis',
      'Gestão de Perfis',
      'Gestão de permissões',
      'Usuários'
    ];

    console.log('📋 Verificando permissões para recursos específicos:');
    
    for (const recurso of recursosTestados) {
      const result = await pool.query(`
        SELECT 
          sf.name as funcionalidade,
          p.action,
          rp.permission_id
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id
        JOIN role_permissions rp ON ura.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN system_features sf ON p.feature_id = sf.id
        WHERE u.username = 'admin'
          AND u.ativo = true
          AND sf.name = $1
          AND sf.is_active = true
        ORDER BY p.action
      `, [recurso]);

      if (result.rows.length > 0) {
        console.log(`\n✅ ${recurso}:`);
        result.rows.forEach(row => {
          console.log(`  - ${row.action}: Permitido`);
        });
      } else {
        console.log(`\n❌ ${recurso}: NENHUMA PERMISSÃO ENCONTRADA`);
      }
    }

    // Testar mapeamento para frontend
    console.log('\n🎯 Testando mapeamento para frontend:');
    
    const featureMapping = {
      'Categorias de Funcionalidades': 'system-features',
      'Funcionalidades do Sistema': 'system-features',
      'Gestão de Perfis': 'roles',
      'Gestão de permissões': 'permissions',
      'Hierarquia de Perfis': 'hierarchy',
      'Usuários': 'usuarios'
    };

    for (const [funcionalidade, frontendResource] of Object.entries(featureMapping)) {
      const result = await pool.query(`
        SELECT 
          sf.name as funcionalidade,
          p.action,
          rp.permission_id
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id
        JOIN role_permissions rp ON ura.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN system_features sf ON p.feature_id = sf.id
        WHERE u.username = 'admin'
          AND u.ativo = true
          AND sf.name = $1
          AND sf.is_active = true
        ORDER BY p.action
      `, [funcionalidade]);

      if (result.rows.length > 0) {
        const hasAdmin = result.rows.some(row => row.action === 'ADMIN');
        const status = hasAdmin ? '✅' : '⚠️';
        console.log(`${status} ${funcionalidade} → ${frontendResource}: ${result.rows.length} permissões (ADMIN: ${hasAdmin ? 'SIM' : 'NÃO'})`);
      } else {
        console.log(`❌ ${funcionalidade} → ${frontendResource}: SEM PERMISSÕES`);
      }
    }

    // Verificar se o problema pode ser na função getUserPermissions
    console.log('\n🔍 Testando função getUserPermissions simulada:');
    
    const result = await pool.query(`
      SELECT 
        sf.name as funcionalidade,
        p.action
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
        AND u.ativo = true
        AND sf.is_active = true
        AND sf.name IN ('Funcinalidades do Sistema', 'Categorias de Funcionalidades', 'Hierarquia de Perfis', 'Gestão de Perfis', 'Gestão de permissões', 'Usuários')
      ORDER BY sf.name, p.action
    `);

    const permissionsMap = {};
    
    result.rows.forEach(row => {
      const frontendResource = featureMapping[row.funcionalidade] || row.funcionalidade.toLowerCase().replace(/\s+/g, '-');
      const permissionLevel = row.action;
      
      if (!permissionsMap[frontendResource] || 
          getPermissionLevel(permissionLevel) > getPermissionLevel(permissionsMap[frontendResource])) {
        permissionsMap[frontendResource] = permissionLevel;
      }
    });

    console.log('\n🎯 Mapa de permissões para recursos específicos:');
    Object.keys(permissionsMap).sort().forEach(resource => {
      console.log(`✅ ${resource}: ${permissionsMap[resource]}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

function getPermissionLevel(permission) {
  const levels = {
    'READ': 1,
    'WRITE': 2,
    'DELETE': 3,
    'ADMIN': 4
  };
  return levels[permission] || 0;
}

testarRecursosEspecificos();
