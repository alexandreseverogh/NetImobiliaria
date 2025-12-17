// Script para debugar JWT do admin
console.log('🔍 Debugando JWT do admin...\n');

// 1. Verificar se há token no localStorage
const token = localStorage.getItem('auth-token');
console.log('Token no localStorage:', token ? 'EXISTE' : 'NÃO EXISTE');

if (token) {
  console.log('Token (primeiros 50 chars):', token.substring(0, 50) + '...');
  
  // 2. Decodificar JWT (sem verificar assinatura)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('\n📋 Payload do JWT:');
    console.log('   User ID:', payload.userId);
    console.log('   Username:', payload.username);
    console.log('   Email:', payload.email);
    console.log('   Role:', payload.role_name);
    console.log('   Role Level:', payload.role_level);
    console.log('   2FA Enabled:', payload.is2FAEnabled);
    
    console.log('\n🔑 Permissões no JWT:');
    if (payload.permissoes) {
      Object.entries(payload.permissoes).forEach(([resource, level]) => {
        console.log(`   ${resource}: ${level}`);
      });
    } else {
      console.log('   ❌ NENHUMA PERMISSÃO ENCONTRADA NO JWT!');
    }
    
    // 3. Verificar permissão específica para usuários
    console.log('\n🎯 Verificação específica:');
    console.log('   Permissão para "usuarios":', payload.permissoes?.usuarios || 'NÃO ENCONTRADA');
    console.log('   Pode editar (WRITE/DELETE/ADMIN):', 
      ['WRITE', 'DELETE', 'ADMIN'].includes(payload.permissoes?.usuarios) ? '✅ SIM' : '❌ NÃO');
    
  } catch (error) {
    console.error('❌ Erro ao decodificar JWT:', error.message);
  }
} else {
  console.log('❌ Nenhum token encontrado no localStorage');
}

// 4. Instruções para o usuário
console.log('\n📋 INSTRUÇÕES:');
console.log('1. Se não há token ou token inválido:');
console.log('   - Faça LOGOUT completo');
console.log('   - Limpe localStorage (F12 → Application → Clear)');
console.log('   - Faça LOGIN novamente');
console.log('');
console.log('2. Se token existe mas sem permissões:');
console.log('   - Faça LOGOUT e LOGIN novamente');
console.log('   - O JWT será regenerado com permissões atuais');


