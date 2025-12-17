const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'src/app/admin/clientes/page.tsx', resource: 'clientes' },
  { path: 'src/app/admin/imoveis/page.tsx', resource: 'imoveis' },
  { path: 'src/app/admin/amenidades/page.tsx', resource: 'amenidades' },
  { path: 'src/app/admin/categorias-amenidades/page.tsx', resource: 'categorias-amenidades' },
  { path: 'src/app/admin/proximidades/page.tsx', resource: 'proximidades' },
  { path: 'src/app/admin/categorias-proximidades/page.tsx', resource: 'categorias-proximidades' },
  { path: 'src/app/admin/tipos-documentos/page.tsx', resource: 'tipos-documentos' },
  { path: 'src/app/admin/tipos-imoveis/page.tsx', resource: 'tipos-imoveis' },
  { path: 'src/app/admin/finalidades/page.tsx', resource: 'finalidades' },
  { path: 'src/app/admin/status-imovel/page.tsx', resource: 'status-imovel' },
  { path: 'src/app/admin/usuarios/page.tsx', resource: 'usuarios' },
  { path: 'src/app/admin/proprietarios/page.tsx', resource: 'proprietarios' }
];

console.log('🔍 Verificando implementação de Permission Guards...\n');

pages.forEach((page, index) => {
  try {
    const fullPath = path.join(process.cwd(), page.path);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`${index + 1}. ❌ ${page.resource}`);
      console.log(`   Arquivo não encontrado: ${page.path}\n`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar importação dos guards
    const hasImport = content.includes('WriteGuard') || content.includes('DeleteGuard');
    const hasWriteGuard = content.includes('<WriteGuard');
    const hasDeleteGuard = content.includes('<DeleteGuard');
    
    // Contar quantos guards foram aplicados
    const writeGuardCount = (content.match(/<WriteGuard/g) || []).length;
    const deleteGuardCount = (content.match(/<DeleteGuard/g) || []).length;
    
    const status = (hasImport && (hasWriteGuard || hasDeleteGuard)) ? '✅' : '❌';
    
    console.log(`${index + 1}. ${status} ${page.resource}`);
    console.log(`   WriteGuard: ${writeGuardCount} | DeleteGuard: ${deleteGuardCount}`);
    
    if (!hasImport) {
      console.log(`   ⚠️  Sem importação de guards`);
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`${index + 1}. ❌ ${page.resource}`);
    console.log(`   Erro ao ler arquivo: ${error.message}\n`);
  }
});

console.log('\n📊 RESUMO:');
let totalImplementado = 0;
let totalPendente = 0;

pages.forEach((page) => {
  try {
    const fullPath = path.join(process.cwd(), page.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasGuards = content.includes('<WriteGuard') || content.includes('<DeleteGuard');
      if (hasGuards) {
        totalImplementado++;
      } else {
        totalPendente++;
      }
    } else {
      totalPendente++;
    }
  } catch (error) {
    totalPendente++;
  }
});

console.log(`  ✅ Implementado: ${totalImplementado}/${pages.length}`);
console.log(`  ❌ Pendente: ${totalPendente}/${pages.length}`);


