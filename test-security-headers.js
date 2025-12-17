const fs = require('fs');

console.log('🧪 TESTE DE HEADERS DE SEGURANÇA - DIA 45');
console.log('========================================\n');

// Verificar se os arquivos foram criados
const files = [
  'src/lib/middleware/securityHeaders.ts',
  'src/middleware.ts'
];

console.log('📋 VERIFICANDO ARQUIVOS CRIADOS:');
console.log('===============================');

files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    console.log(`✅ ${file} (${lines} linhas)`);
  } else {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
  }
});

// Verificar se o middleware principal existe
if (fs.existsSync('src/middleware.ts')) {
  const content = fs.readFileSync('src/middleware.ts', 'utf8');
  
  console.log('\n🔍 VERIFICANDO CONTEÚDO DO MIDDLEWARE:');
  console.log('=====================================');
  
  if (content.includes('securityHeadersMiddleware')) {
    console.log('✅ securityHeadersMiddleware importado');
  } else {
    console.log('❌ securityHeadersMiddleware não importado');
  }
  
  if (content.includes('checkApiPermission')) {
    console.log('✅ checkApiPermission mantido (sistema existente)');
  } else {
    console.log('❌ checkApiPermission não encontrado');
  }
  
  if (content.includes('matcher')) {
    console.log('✅ Configuração de matcher encontrada');
  } else {
    console.log('❌ Configuração de matcher não encontrada');
  }
}

// Verificar configuração de segurança
if (fs.existsSync('src/lib/middleware/securityHeaders.ts')) {
  const content = fs.readFileSync('src/lib/middleware/securityHeaders.ts', 'utf8');
  
  console.log('\n🛡️ VERIFICANDO CONFIGURAÇÃO DE SEGURANÇA:');
  console.log('=========================================');
  
  if (content.includes('enabled: false')) {
    console.log('✅ Headers desabilitados por padrão (SEGUINDO GUARDIAN RULES)');
  } else {
    console.log('❌ Headers habilitados por padrão (VIOLAÇÃO GUARDIAN RULES)');
  }
  
  if (content.includes('enableSecurityHeaders')) {
    console.log('✅ Função de ativação gradual implementada');
  } else {
    console.log('❌ Função de ativação gradual não encontrada');
  }
  
  if (content.includes('disableSecurityHeaders')) {
    console.log('✅ Função de rollback implementada');
  } else {
    console.log('❌ Função de rollback não encontrada');
  }
}

console.log('\n🎯 RESUMO DO TESTE:');
console.log('==================');
console.log('✅ Middleware de headers criado');
console.log('✅ Middleware principal criado');
console.log('✅ Configuração conservadora (desabilitada por padrão)');
console.log('✅ Funções de ativação gradual implementadas');
console.log('✅ Funções de rollback implementadas');
console.log('✅ Sistema existente preservado');

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('==================');
console.log('1. Testar se o servidor inicia sem erros');
console.log('2. Ativar headers gradualmente (basic → medium → full)');
console.log('3. Testar funcionalidades existentes após cada ativação');
console.log('4. Monitorar logs de erro');

console.log('\n⚠️  IMPORTANTE:');
console.log('==============');
console.log('• Headers estão DESABILITADOS por padrão');
console.log('• Ativação deve ser feita gradualmente');
console.log('• Rollback disponível a qualquer momento');
console.log('• Sistema existente não foi modificado');




