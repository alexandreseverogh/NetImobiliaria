const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarNovoMapeamento() {
  try {
    console.log('🔍 Testando NOVO mapeamento de permissões...\n');

    // Buscar permissões do admin (nova query)
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
      ORDER BY sf.name, p.action
    `);

    console.log('📋 Permissões encontradas (nova query):');
    
    // Mapeamento por funcionalidade
    const featureMapping = {
      'Categorias de Funcionalidades': 'system-features',
      'Funcionalidades do Sistema': 'system-features',
      'Gestão de Perfis': 'roles',
      'Gestão de permissões': 'permissions',
      'Hierarquia de Perfis': 'hierarchy',
      'Usuários': 'usuarios',
      'Imóveis': 'imoveis',
      'Tipos de Imóveis': 'tipos-imoveis',
      'Finalidades de Imóveis': 'finalidades',
      'Status de Imóveis': 'status-imovel',
      'Mudança de Status': 'mudancas-status',
      'Amenidades': 'amenidades',
      'Categorias de Amenidades': 'categorias-amenidades',
      'Proximidades': 'proximidades',
      'Categorias de Proximidades': 'categorias-proximidades',
      'Tipos de Documentos': 'tipos-documentos',
      'Clientes': 'clientes',
      'Proprietários': 'proprietarios',
      'Dashboard': 'dashboards',
      'Relatórios': 'relatorios'
    };

    const actionMapping = {
      'READ': 'READ',
      'WRITE': 'WRITE', 
      'DELETE': 'DELETE',
      'ADMIN': 'ADMIN'
    };

    const permissionsMap = {};
    
    result.rows.forEach(row => {
      const frontendResource = featureMapping[row.funcionalidade] || row.funcionalidade.toLowerCase().replace(/\s+/g, '-');
      const permissionLevel = actionMapping[row.action] || row.action;
      
      // Manter o nível mais alto de permissão para cada recurso
      if (!permissionsMap[frontendResource] || 
          getPermissionLevel(permissionLevel) > getPermissionLevel(permissionsMap[frontendResource])) {
        permissionsMap[frontendResource] = permissionLevel;
      }
      
      console.log(`${row.funcionalidade} → ${frontendResource} [${row.action} → ${permissionLevel}]`);
    });

    console.log('\n🎯 Mapa final de permissões para o admin:');
    Object.keys(permissionsMap).sort().forEach(resource => {
      console.log(`✅ ${resource}: ${permissionsMap[resource]}`);
    });

    console.log('\n📊 Resumo:');
    console.log(`Total de recursos únicos: ${Object.keys(permissionsMap).length}`);
    console.log('Recursos esperados na sidebar:');
    console.log('- admin-panel, permissions, hierarchy, roles, usuarios');
    console.log('- imoveis, clientes, proprietarios, amenidades, proximidades');
    console.log('- tipos-documentos, finalidades, status-imovel, tipos-imoveis');
    console.log('- dashboards, relatorios, categorias-amenidades, categorias-proximidades');
    console.log('- mudancas-status, system-features');

    // Verificar se todos os recursos esperados estão presentes
    const recursosEsperados = [
      'admin-panel', 'permissions', 'hierarchy', 'roles', 'usuarios',
      'imoveis', 'clientes', 'proprietarios', 'amenidades', 'proximidades',
      'tipos-documentos', 'finalidades', 'status-imovel', 'tipos-imoveis',
      'dashboards', 'relatorios', 'categorias-amenidades', 'categorias-proximidades',
      'mudancas-status', 'system-features'
    ];

    console.log('\n🔍 Verificação de recursos esperados:');
    recursosEsperados.forEach(recurso => {
      const status = permissionsMap[recurso] ? '✅' : '❌';
      console.log(`${status} ${recurso}: ${permissionsMap[recurso] || 'NÃO ENCONTRADO'}`);
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

testarNovoMapeamento();
