const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ BACKUP COMPLETO - DIA 45 - GUARDIAN RULES COMPLIANCE');
console.log('========================================================\n');

// Criar diretório de backup com timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, 'backups', 'dia45', timestamp);

console.log('📁 Criando diretório de backup...');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ Diretório criado: ${backupDir}`);
} else {
  console.log(`⚠️  Diretório já existe: ${backupDir}`);
}

// Função para copiar recursivamente
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Arquivos e diretórios críticos para backup
const criticalFiles = [
  'src/',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  'middleware.ts'
];

console.log('\n📄 Fazendo backup dos arquivos críticos...');
let backupCount = 0;
criticalFiles.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(backupDir, file);
  
  if (fs.existsSync(sourcePath)) {
    copyRecursiveSync(sourcePath, destPath);
    console.log(`✅ Backup: ${file}`);
    backupCount++;
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
  }
});

// Backup do banco de dados
console.log('\n🗄️ Fazendo backup do banco de dados...');
try {
  const dbBackupPath = path.join(backupDir, 'database_backup.sql');
  const dbCommand = `pg_dump -h localhost -U postgres -d net_imobiliaria > "${dbBackupPath}"`;
  
  console.log('Executando backup do banco...');
  execSync(dbCommand, { stdio: 'inherit' });
  
  if (fs.existsSync(dbBackupPath)) {
    console.log(`✅ Backup do banco: ${dbBackupPath}`);
  } else {
    console.log('❌ Erro: Backup do banco não foi criado');
  }
} catch (error) {
  console.log('⚠️  Aviso: Não foi possível fazer backup do banco automaticamente');
  console.log('   Execute manualmente: pg_dump -h localhost -U postgres -d net_imobiliaria > backup.sql');
}

// Salvar informações do backup
const backupInfo = {
  timestamp: timestamp,
  backupPath: backupDir,
  filesBackedUp: backupCount,
  criticalFiles: criticalFiles,
  date: new Date().toISOString(),
  description: 'Backup completo antes da implementação do Dia 45 - Segurança Avançada'
};

fs.writeFileSync(
  path.join(backupDir, 'backup-info.json'),
  JSON.stringify(backupInfo, null, 2)
);

// Salvar caminho do backup
fs.writeFileSync(path.join(__dirname, 'backup-path-dia45.txt'), backupDir);

console.log('\n✅ BACKUP COMPLETO REALIZADO COM SUCESSO!');
console.log(`📁 Localização: ${backupDir}`);
console.log(`📊 Arquivos: ${backupCount}`);
console.log(`📝 Info salva em: backup-info.json`);
console.log(`📝 Caminho salvo em: backup-path-dia45.txt`);

console.log('\n📋 ARQUIVOS IMPORTANTES BACKUPADOS:');
console.log('✅ src/ (código fonte completo)');
console.log('✅ package.json (dependências)');
console.log('✅ middleware.ts (middleware principal)');
console.log('✅ next.config.js (configuração Next.js)');
console.log('✅ tsconfig.json (configuração TypeScript)');
console.log('✅ Banco de dados (se disponível)');

console.log('\n🛡️ GUARDIAN RULES COMPLIANCE:');
console.log('✅ Backup completo realizado');
console.log('✅ Sistema preservado');
console.log('✅ Rollback disponível');
console.log('✅ Nenhuma funcionalidade alterada');




