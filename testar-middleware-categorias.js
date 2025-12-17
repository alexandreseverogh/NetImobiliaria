// Script para testar se o middleware está funcionando corretamente para categorias
console.log('🔍 TESTE: Verificando middleware para /api/admin/categorias...\n');

// Simular a lógica do middleware
const routePermissions = {
  '/api/admin/categorias': { resource: null, action: null },
  '/api/admin/categorias/[id]': { resource: null, action: null },
  '/api/admin/categorias/[id]/features': { resource: null, action: null },
  '/admin/categorias': { resource: null, action: null },
  '/admin/categorias/novo': { resource: null, action: null },
  '/admin/categorias/[id]/editar': { resource: null, action: null },
  '/admin/categorias/[id]': { resource: null, action: null },
  '/admin/categorias/[id]/features': { resource: null, action: null },
};

function findPermissionConfig(pathname, method) {
  // Determinar a ação baseada no método HTTP
  let action = 'READ';
  
  switch (method) {
    case 'GET':
      action = 'READ';
      break;
    case 'POST':
    case 'PUT':
    case 'PATCH':
      action = 'WRITE';
      break;
    case 'DELETE':
      action = 'DELETE';
      break;
    default:
      action = 'READ';
  }
  
  // Buscar configuração exata primeiro
  if (routePermissions[pathname]) {
    console.log(`✅ Configuração exata encontrada para ${pathname}:`, routePermissions[pathname]);
    return routePermissions[pathname];
  }
  
  // Buscar por padrões de rota com parâmetros dinâmicos
  for (const [pattern, config] of Object.entries(routePermissions)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      // Converter padrão para regex
      const regexPattern = pattern
        .replace(/\[.*?\]/g, '[^/]+') // Substituir [id] por regex
        .replace(/\//g, '\\/'); // Escapar barras
      
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(pathname)) {
        console.log(`✅ Configuração por padrão encontrada para ${pathname}:`, config);
        return config;
      }
    }
  }
  
  // Se não encontrou configuração específica, usar ação baseada no método
  // Extrair o recurso da rota (ex: /api/admin/usuarios -> usuarios)
  const pathParts = pathname.split('/');
  if (pathParts.length >= 4 && pathParts[1] === 'api' && pathParts[2] === 'admin') {
    const resource = pathParts[3];
    const fallbackConfig = { resource, action };
    console.log(`⚠️ Usando configuração fallback para ${pathname}:`, fallbackConfig);
    return fallbackConfig;
  }
  
  console.log(`❌ Nenhuma configuração encontrada para ${pathname}`);
  return null;
}

function checkApiPermission(pathname, method) {
  console.log(`\n🔍 Verificando permissão para ${method} ${pathname}:`);
  
  const permissionConfig = findPermissionConfig(pathname, method);
  
  console.log('Config encontrada:', permissionConfig);
  
  if (!permissionConfig || !permissionConfig.resource || !permissionConfig.action) {
    console.log('✅ Rota não precisa de verificação de permissão - retornando null');
    return null;
  }
  
  console.log('❌ Rota precisa de verificação de permissão - deveria verificar token');
  return 'VERIFICAR_TOKEN';
}

// Testar diferentes cenários
console.log('1️⃣ Testando /api/admin/categorias GET:');
const result1 = checkApiPermission('/api/admin/categorias', 'GET');

console.log('\n2️⃣ Testando /api/admin/categorias POST:');
const result2 = checkApiPermission('/api/admin/categorias', 'POST');

console.log('\n3️⃣ Testando /api/admin/categorias/123 PUT:');
const result3 = checkApiPermission('/api/admin/categorias/123', 'PUT');

console.log('\n4️⃣ Testando /api/admin/categorias/123/features GET:');
const result4 = checkApiPermission('/api/admin/categorias/123/features', 'GET');

console.log('\n5️⃣ Testando /api/admin/usuarios GET (para comparação):');
const result5 = checkApiPermission('/api/admin/usuarios', 'GET');

console.log('\n🎯 RESULTADO FINAL:');
console.log('Se todas as rotas de categorias retornarem null, o middleware está correto!');
console.log('Se alguma retornar "VERIFICAR_TOKEN", ainda há problema na configuração.');

const allCategoriasNull = [result1, result2, result3, result4].every(r => r === null);
console.log(`\nStatus: ${allCategoriasNull ? '✅ CORRETO' : '❌ AINDA HÁ PROBLEMA'}`);
