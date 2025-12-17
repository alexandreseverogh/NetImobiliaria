/**
 * Script para testar as APIs de roles
 * Execute: node test-roles-api.js
 */

require('dotenv').config({ path: '.env.local' });

const baseUrl = 'http://localhost:3000';

// Função para fazer requisições
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function testRolesAPI() {
  console.log('🧪 TESTANDO APIs DE ROLES...\n');

  try {
    // 1. Testar GET /api/admin/roles
    console.log('1️⃣ Testando GET /api/admin/roles...');
    const getRolesResult = await makeRequest(`${baseUrl}/api/admin/roles`);
    
    if (getRolesResult.status === 200) {
      console.log('   ✅ GET /api/admin/roles - SUCESSO');
      console.log(`   📊 ${getRolesResult.data.roles?.length || 0} roles encontrados`);
      
      if (getRolesResult.data.roles?.length > 0) {
        console.log('   📋 Roles encontrados:');
        getRolesResult.data.roles.forEach(role => {
          console.log(`      - ${role.name} (Nível ${role.level}) - 2FA: ${role.two_fa_required ? 'Sim' : 'Não'}`);
        });
      }
    } else {
      console.log('   ❌ GET /api/admin/roles - FALHOU');
      console.log(`   Status: ${getRolesResult.status}`);
      console.log(`   Erro: ${getRolesResult.data?.message || getRolesResult.error}`);
    }

    console.log('');

    // 2. Testar GET /api/admin/permissions
    console.log('2️⃣ Testando GET /api/admin/permissions...');
    const getPermissionsResult = await makeRequest(`${baseUrl}/api/admin/permissions`);
    
    if (getPermissionsResult.status === 200) {
      console.log('   ✅ GET /api/admin/permissions - SUCESSO');
      console.log(`   📊 ${getPermissionsResult.data.permissions?.length || 0} permissões encontradas`);
      
      if (getPermissionsResult.data.permissionsByCategory) {
        console.log('   📋 Permissões por categoria:');
        Object.entries(getPermissionsResult.data.permissionsByCategory).forEach(([category, permissions]) => {
          console.log(`      - ${category}: ${permissions.length} permissões`);
        });
      }
    } else {
      console.log('   ❌ GET /api/admin/permissions - FALHOU');
      console.log(`   Status: ${getPermissionsResult.status}`);
      console.log(`   Erro: ${getPermissionsResult.data?.message || getPermissionsResult.error}`);
    }

    console.log('');

    // 3. Testar POST /api/admin/roles (criar role)
    console.log('3️⃣ Testando POST /api/admin/roles...');
    const newRole = {
      name: 'Teste Role',
      description: 'Role de teste criado via API',
      level: 5,
      two_fa_required: false,
      is_active: true
    };

    const createRoleResult = await makeRequest(`${baseUrl}/api/admin/roles`, {
      method: 'POST',
      body: JSON.stringify(newRole)
    });

    if (createRoleResult.status === 200) {
      console.log('   ✅ POST /api/admin/roles - SUCESSO');
      console.log(`   📝 Role criado: ${createRoleResult.data.role?.name}`);
      
      const createdRoleId = createRoleResult.data.role?.id;

      // 4. Testar GET /api/admin/roles/[id]
      if (createdRoleId) {
        console.log('');
        console.log(`4️⃣ Testando GET /api/admin/roles/${createdRoleId}...`);
        
        const getRoleResult = await makeRequest(`${baseUrl}/api/admin/roles/${createdRoleId}`);
        
        if (getRoleResult.status === 200) {
          console.log('   ✅ GET /api/admin/roles/[id] - SUCESSO');
          console.log(`   📋 Role: ${getRoleResult.data.role?.name}`);
        } else {
          console.log('   ❌ GET /api/admin/roles/[id] - FALHOU');
          console.log(`   Status: ${getRoleResult.status}`);
          console.log(`   Erro: ${getRoleResult.data?.message || getRoleResult.error}`);
        }

        // 5. Testar PATCH /api/admin/roles/[id]/toggle-2fa
        console.log('');
        console.log(`5️⃣ Testando PATCH /api/admin/roles/${createdRoleId}/toggle-2fa...`);
        
        const toggle2FAResult = await makeRequest(`${baseUrl}/api/admin/roles/${createdRoleId}/toggle-2fa`, {
          method: 'PATCH',
          body: JSON.stringify({ two_fa_required: true })
        });

        if (toggle2FAResult.status === 200) {
          console.log('   ✅ PATCH /api/admin/roles/[id]/toggle-2fa - SUCESSO');
          console.log(`   🔐 2FA ${toggle2FAResult.data.role?.two_fa_required ? 'habilitado' : 'desabilitado'}`);
        } else {
          console.log('   ❌ PATCH /api/admin/roles/[id]/toggle-2fa - FALHOU');
          console.log(`   Status: ${toggle2FAResult.status}`);
          console.log(`   Erro: ${toggle2FAResult.data?.message || toggle2FAResult.error}`);
        }

        // 6. Testar PATCH /api/admin/roles/[id]/toggle-active
        console.log('');
        console.log(`6️⃣ Testando PATCH /api/admin/roles/${createdRoleId}/toggle-active...`);
        
        const toggleActiveResult = await makeRequest(`${baseUrl}/api/admin/roles/${createdRoleId}/toggle-active`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: false })
        });

        if (toggleActiveResult.status === 200) {
          console.log('   ✅ PATCH /api/admin/roles/[id]/toggle-active - SUCESSO');
          console.log(`   👤 Status ${toggleActiveResult.data.role?.is_active ? 'ativado' : 'desativado'}`);
        } else {
          console.log('   ❌ PATCH /api/admin/roles/[id]/toggle-active - FALHOU');
          console.log(`   Status: ${toggleActiveResult.status}`);
          console.log(`   Erro: ${toggleActiveResult.data?.message || toggleActiveResult.error}`);
        }

        // 7. Testar DELETE /api/admin/roles/[id]
        console.log('');
        console.log(`7️⃣ Testando DELETE /api/admin/roles/${createdRoleId}...`);
        
        const deleteRoleResult = await makeRequest(`${baseUrl}/api/admin/roles/${createdRoleId}`, {
          method: 'DELETE'
        });

        if (deleteRoleResult.status === 200) {
          console.log('   ✅ DELETE /api/admin/roles/[id] - SUCESSO');
          console.log(`   🗑️ Role excluído com sucesso`);
        } else {
          console.log('   ❌ DELETE /api/admin/roles/[id] - FALHOU');
          console.log(`   Status: ${deleteRoleResult.status}`);
          console.log(`   Erro: ${deleteRoleResult.data?.message || deleteRoleResult.error}`);
        }
      }
    } else {
      console.log('   ❌ POST /api/admin/roles - FALHOU');
      console.log(`   Status: ${createRoleResult.status}`);
      console.log(`   Erro: ${createRoleResult.data?.message || createRoleResult.error}`);
    }

    console.log('');
    console.log('🎉 TESTE CONCLUÍDO!');
    console.log('   Todas as APIs de roles foram testadas.');

  } catch (error) {
    console.error('❌ ERRO durante o teste:', error);
  }
}

// Executar teste
testRolesAPI();


