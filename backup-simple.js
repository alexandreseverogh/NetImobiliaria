const fs = require('fs');
const path = require('path');

console.log('🛡️ BACKUP SIMPLES - DIA 45');
console.log('==========================\n');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                 new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];

const backupDir = `backups/dia45/${timestamp}`;

try {
  // 1. Criar diretório de backup
  console.log('📁 Criando diretório de backup...');
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ Diretório criado: ${backupDir}\n`);

  // 2. Função para copiar recursivamente
  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const files = fs.readdirSync(src);
      files.forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  // 3. Backup dos arquivos críticos
  console.log('📄 Fazendo backup dos arquivos críticos...');
  
  const criticalFiles = [
    'src',
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
      copyRecursive(file, destPath);
      console.log(`✅ Backup: ${file}`);
    } else {
      console.log(`⚠️  Arquivo não encontrado: ${file}`);
    }
  });

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
  
  // 5. Salvar caminho do backup para rollback
  fs.writeFileSync('backup-path.txt', backupDir);
  console.log(`\n📝 Caminho salvo em: backup-path.txt`);

  // 6. Listar arquivos importantes
  console.log('\n📋 ARQUIVOS IMPORTANTES BACKUPADOS:');
  const importantFiles = [
    'src/lib/middleware/',
    'src/app/api/admin/auth/',
    'src/lib/database/',
    'src/services/',
    'package.json'
  ];
  
  importantFiles.forEach(file => {
    const fullPath = path.join(backupDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - NÃO ENCONTRADO`);
    }
  });

} catch (error) {
  console.error('❌ ERRO NO BACKUP:', error.message);
  process.exit(1);
}




