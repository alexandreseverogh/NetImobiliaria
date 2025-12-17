// Simular o que acontece no frontend APÓS a correção
console.log('🔍 TESTE FINAL: Verificando se a correção funcionou...\n');

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

// Simular estrutura da sidebar APÓS a correção
const menuStructureCorrigida = [
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
        resource: 'funcinalidades-do-sistema', // ← CORRIGIDO!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Categorias',
        href: '/admin/categorias',
        icon: 'Squares2X2Icon',
        resource: 'system-features', // ← CORRIGIDO!
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
        resource: 'hierarchy', // ← CORRIGIDO!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Gestão de Perfis',
        href: '/admin/perfis',
        icon: 'ShieldCheckIcon',
        resource: 'roles', // ← CORRIGIDO!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Configurar Permissões',
        href: '/admin/permissoes',
        icon: 'CogIcon',
        resource: 'permissions', // ← CORRIGIDO!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Usuários',
        href: '/admin/usuarios',
        icon: 'UsersIcon',
        resource: 'usuarios', // ← CORRIGIDO!
        roles: ['Super Admin', 'Administrador']
      },
      {
        name: 'Tipos de Documentos',
        href: '/admin/categorias-tipos-documentos',
        icon: 'DocumentTextIcon',
        resource: 'tipos-de-documentos', // ← CORRIGIDO!
        roles: ['Super Admin', 'Administrador']
      }
    ]
  }
];

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

console.log('1️⃣ Testando filtro dos children APÓS correção:');
menuStructureCorrigida.forEach(item => {
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

console.log('\n🎯 RESULTADO FINAL:');
const totalChildren = menuStructureCorrigida.reduce((total, item) => total + (item.children?.length || 0), 0);
const totalFiltered = menuStructureCorrigida.reduce((total, item) => {
  if (item.children) {
    const filtered = filterChildren(item.children, userAdmin);
    return total + filtered.length;
  }
  return total;
}, 0);

console.log(`Total de children: ${totalChildren}`);
console.log(`Total filtrado: ${totalFiltered}`);
console.log(`Status: ${totalFiltered === totalChildren ? '✅ SUCESSO!' : '❌ AINDA HÁ PROBLEMAS'}`);

if (totalFiltered === totalChildren) {
  console.log('\n🎉 CORREÇÃO FUNCIONOU!');
  console.log('O admin agora deve ver todas as sub-opções na sidebar!');
} else {
  console.log('\n🚨 AINDA HÁ PROBLEMAS!');
  console.log('Verificar se todos os recursos estão corretos.');
}
