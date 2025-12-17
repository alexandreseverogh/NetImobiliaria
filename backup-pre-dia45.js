const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ INICIANDO BACKUP COMPLETO - DIA 45');
console.log('=====================================\n');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                 new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];

const backupDir = `backups/dia45/${timestamp}`;

try {
  // 1. Criar diretório de backup
  console.log('📁 Criando diretório de backup...');
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ Diretório criado: ${backupDir}\n`);

  // 2. Backup dos arquivos críticos
  console.log('📄 Fazendo backup dos arquivos críticos...');
  
  const criticalFiles = [
    'src/',
    'package.json',
    'package-lock.json',
    '.env.local',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.js',
    'postcss.config.js'
  ];

  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const destPath = path.join(backupDir, file);
      const destDir = path.dirname(destPath);
      
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      if (fs.statSync(file).isDirectory()) {
        // Usar xcopy no Windows
        execSync(`xcopy "${file}" "${destPath}" /E /I /H /Y`, { stdio: 'inherit' });
      } else {
        fs.copyFileSync(file, destPath);
      }
      
      console.log(`✅ Backup: ${file}`);
    } else {
      console.log(`⚠️  Arquivo não encontrado: ${file}`);
    }
  });

  // 3. Backup do banco de dados
  console.log('\n🗄️ Fazendo backup do banco de dados...');
  const dbBackupFile = `${backupDir}/database_backup.sql`;
  
  try {
    execSync(`pg_dump -h localhost -U postgres -d net_imobiliaria > "${dbBackupFile}"`, { 
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: 'Roberto@2007' }
    });
    console.log(`✅ Backup do banco: ${dbBackupFile}`);
  } catch (error) {
    console.log('⚠️  Erro no backup do banco (continuando...):', error.message);
  }

  // 4. Criar arquivo de informações do backup
  const backupInfo = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    description: 'Backup completo antes da implementação do Dia 45 - Segurança Avançada',
    files: criticalFiles.filter(file => fs.existsSync(file)),
    database: 'net_imobiliaria',
    backupDir: backupDir
  };

  fs.writeFileSync(
    path.join(backupDir, 'backup-info.json'), 
    JSON.stringify(backupInfo, null, 2)
  );

  console.log('\n✅ BACKUP COMPLETO REALIZADO COM SUCESSO!');
  console.log(`📁 Localização: ${backupDir}`);
  console.log(`📊 Arquivos: ${criticalFiles.filter(f => fs.existsSync(f)).length}`);
  console.log(`🗄️ Banco: ${fs.existsSync(dbBackupFile) ? 'Sim' : 'Não'}`);
  
  // 5. Salvar caminho do backup para rollback
  fs.writeFileSync('backup-path.txt', backupDir);
  console.log(`\n📝 Caminho salvo em: backup-path.txt`);

} catch (error) {
  console.error('❌ ERRO NO BACKUP:', error.message);
  process.exit(1);
}
