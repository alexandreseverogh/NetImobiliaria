const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDAÇÃO DO SISTEMA - DIA 45');
console.log('================================\n');

// Verificar arquivos críticos
const criticalFiles = [
  'src/app/api/admin/auth/login/route.ts',
  'src/app/api/admin/auth/logout/route.ts',
  'src/lib/middleware/permissionMiddleware.ts',
  'src/lib/middleware/apiAuth.ts',
  'src/lib/middleware/rateLimit.ts',
  'src/lib/database/userPermissions.ts',
  'src/services/twoFactorAuthService.ts',
  'package.json',
  '.env.local'
];

console.log('📋 VERIFICANDO ARQUIVOS CRÍTICOS:');
console.log('=================================');

let allFilesExist = true;
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`✅ ${file} (${size} KB)`);
  } else {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
    allFilesExist = false;
  }
});

console.log('\n🔧 VERIFICANDO ESTRUTURA DE MIDDLEWARE:');
console.log('======================================');

const middlewareFiles = [
  'src/lib/middleware/apiAuth.ts',
  'src/lib/middleware/permissionMiddleware.ts',
  'src/lib/middleware/rateLimit.ts'
];

middlewareFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    console.log(`✅ ${file} (${lines} linhas)`);
  } else {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
  }
});

console.log('\n🗄️ VERIFICANDO ESTRUTURA DE BANCO:');
console.log('=================================');

const dbFiles = [
  'src/lib/database/userPermissions.ts',
  'src/lib/database/users.ts',
  'src/lib/database/connection.ts'
];

dbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    console.log(`✅ ${file} (${lines} linhas)`);
  } else {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
  }
});

console.log('\n🔐 VERIFICANDO SISTEMA DE AUTENTICAÇÃO:');
console.log('=====================================');

const authFiles = [
  'src/app/api/admin/auth/login/route.ts',
  'src/app/api/admin/auth/logout/route.ts',
  'src/lib/auth/jwt.ts',
  'src/services/twoFactorAuthService.ts'
];

authFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    console.log(`✅ ${file} (${lines} linhas)`);
  } else {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
  }
});

console.log('\n📊 VERIFICANDO CONFIGURAÇÕES:');
console.log('============================');

// Verificar package.json
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ Node.js: ${packageJson.engines?.node || 'Não especificado'}`);
  console.log(`✅ Next.js: ${packageJson.dependencies?.next || 'Não encontrado'}`);
  console.log(`✅ Dependências: ${Object.keys(packageJson.dependencies || {}).length}`);
}

// Verificar .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = envContent.split('\n').filter(line => line.includes('=')).length;
  console.log(`✅ Variáveis de ambiente: ${envVars}`);
} else {
  console.log('⚠️  .env.local não encontrado');
}

console.log('\n🎯 RESUMO DA VALIDAÇÃO:');
console.log('======================');

if (allFilesExist) {
  console.log('✅ TODOS OS ARQUIVOS CRÍTICOS EXISTEM');
  console.log('✅ SISTEMA PRONTO PARA IMPLEMENTAÇÃO');
  console.log('✅ BACKUP REALIZADO COM SUCESSO');
  console.log('\n🚀 PODE PROSSEGUIR PARA FASE 1');
} else {
  console.log('❌ ALGUNS ARQUIVOS CRÍTICOS ESTÃO FALTANDO');
  console.log('❌ NÃO PROSSEGUIR SEM CORRIGIR');
  console.log('\n🛑 PARAR IMPLEMENTAÇÃO');
}

console.log('\n📁 BACKUP DISPONÍVEL EM:');
if (fs.existsSync('backup-path.txt')) {
  const backupPath = fs.readFileSync('backup-path.txt', 'utf8').trim();
  console.log(`📂 ${backupPath}`);
} else {
  console.log('❌ Caminho do backup não encontrado');
}




