// Simular o que acontece no frontend
console.log('🔍 DEBUG: Simulando lógica da sidebar...\n');

// Simular dados do usuário admin (como viriam do backend)
const userAdmin = {
  username: 'admin',
  nome: 'Administrador Principal',
  role_name: 'Super Admin',
  permissoes: {
    'amenidades': 'ADMIN',
    'categorias-de-amenidades': 'ADMIN',
    'categorias-de-proximidades': 'ADMIN',
    'clientes': 'ADMIN',
    'dashboard': 'ADMIN',
    'finalidades-de-imóveis': 'ADMIN',
    'funcinalidades-do-sistema': 'ADMIN',
    'hierarchy': 'ADMIN',
    'imóveis': 'ADMIN',
    'mudança-de-status': 'ADMIN',
    'permissions': 'ADMIN',
    'proprietários': 'ADMIN',
    'proximidades': 'ADMIN',
    'relatórios': 'ADMIN',
    'roles': 'ADMIN',
    'status-de-imóveis': 'ADMIN',
    'system-features': 'ADMIN',
    'tipos-de-documentos': 'ADMIN',
    'tipos-de-imóveis': 'ADMIN',
    'usuarios': 'ADMIN'
  }
};

// Simular estrutura da sidebar (children específicos)
const menuStructure = [
  {
    name: 'Painel do Sistema',
    icon: 'WrenchScrewdriverIcon',
    resource: 'system-panel',
    roles: ['Super Admin', 'Administrador'],
    children: [
      {
        name: 'Funcionalidades',
        href: '/admin/system-features',
        icon: 'CogIcon',
        resource: 'Funcinalidades do Sistema', // ← PROBLEMA AQUI!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Categorias',
        href: '/admin/categorias',
        icon: 'Squares2X2Icon',
        resource: 'Categorias de Funcionalidades', // ← PROBLEMA AQUI!
        roles: ['Super Admin', 'Administrador']
      }
    ]
  },
  {
    name: 'Painel Administrativo',
    icon: 'ShieldCheckIcon',
    resource: 'admin-panel',
    roles: ['Super Admin', 'Administrador'],
    children: [
      {
        name: 'Hierarquia de Perfis',
        href: '/admin/hierarquia-perfis',
        icon: 'UserGroupIcon',
        resource: 'Hierarquia de Perfis', // ← PROBLEMA AQUI!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Gestão de Perfis',
        href: '/admin/perfis',
        icon: 'ShieldCheckIcon',
        resource: 'Gestão de Perfis', // ← PROBLEMA AQUI!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Configurar Permissões',
        href: '/admin/permissoes',
        icon: 'CogIcon',
        resource: 'Gestão de permissões', // ← PROBLEMA AQUI!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Usuários',
        href: '/admin/usuarios',
        icon: 'UsersIcon',
        resource: 'Usuários', // ← PROBLEMA AQUI!
        roles: ['Super Admin', 'Administrador']
      }
    ]
  }
];

// Simular função de filtro da sidebar
function getFilteredMenu(user, allItems) {
  return allItems.filter(item => {
    // Admin e Super Admin sempre têm acesso a tudo
    if (['Administrador', 'Super Admin'].includes(user.role_name)) {
      return true
    }
    
    // Outros perfis: verificar se têm permissão para o recurso
    if (item.resource && user.permissoes) {
      return user.permissoes[item.resource] !== undefined
    }
    
    return false
  })
}

// Simular função de filtro para children
function filterChildren(children, user) {
  return children.filter(child => {
    // Admin e Super Admin sempre têm acesso a tudo
    if (['Administrador', 'Super Admin'].includes(user.role_name)) {
      return true
    }
    
    // Outros perfis: verificar se têm permissão para o recurso
    if (child.resource && user.permissoes) {
      return user.permissoes[child.resource] !== undefined
    }
    
    return false
  })
}

console.log('1️⃣ Testando filtro principal da sidebar:');
const filteredMenu = getFilteredMenu(userAdmin, menuStructure);
console.log(`Itens principais filtrados: ${filteredMenu.length}`);
filteredMenu.forEach(item => {
  console.log(`✅ ${item.name} (resource: ${item.resource})`);
});

console.log('\n2️⃣ Testando filtro dos children:');
filteredMenu.forEach(item => {
  if (item.children) {
    console.log(`\n📋 ${item.name}:`);
    const filteredChildren = filterChildren(item.children, userAdmin);
    console.log(`Children filtrados: ${filteredChildren.length}/${item.children.length}`);
    
    item.children.forEach(child => {
      const temPermissao = userAdmin.permissoes[child.resource] !== undefined;
      const status = temPermissao ? '✅' : '❌';
      console.log(`  ${status} ${child.name} (resource: "${child.resource}"): ${userAdmin.permissoes[child.resource] || 'SEM PERMISSÃO'}`);
    });
  }
});

console.log('\n3️⃣ Verificando mapeamento de recursos:');
const mapeamentoRecursos = {
  'Funcinalidades do Sistema': 'funcinalidades-do-sistema',
  'Categorias de Funcionalidades': 'system-features',
  'Hierarquia de Perfis': 'hierarchy',
  'Gestão de Perfis': 'roles',
  'Gestão de permissões': 'permissions',
  'Usuários': 'usuarios'
};

console.log('Mapeamento esperado vs atual:');
Object.entries(mapeamentoRecursos).forEach(([recursoSidebar, recursoPermissao]) => {
  const temPermissao = userAdmin.permissoes[recursoPermissao] !== undefined;
  const status = temPermissao ? '✅' : '❌';
  console.log(`${status} "${recursoSidebar}" → "${recursoPermissao}": ${userAdmin.permissoes[recursoPermissao] || 'SEM PERMISSÃO'}`);
});

console.log('\n🎯 CONCLUSÃO:');
console.log('Se todos os status forem ✅, o problema não é no filtro!');
console.log('Se algum status for ❌, o problema é no mapeamento de recursos!');
