require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkTiposDocumentosPermissions() {
  try {
    console.log('🔍 VERIFICANDO IMPACTO DA MUDANÇA DE "TIPOS DE DOCUMENTOS"\n');
    
    // 1. Verificar a feature atual
    console.log('1️⃣ FEATURE ATUAL:');
    const featureResult = await pool.query(`
      SELECT id, name, category, url, is_active
      FROM system_features
      WHERE category = 'tipos-documentos' OR name ILIKE '%tipo%documento%'
      ORDER BY name
    `);
    
    featureResult.rows.forEach(row => {
      console.log(`   📋 ID: ${row.id} | Nome: ${row.name} | Categoria: ${row.category}`);
      console.log(`      URL: ${row.url} | Ativo: ${row.is_active}\n`);
    });
    
    // 2. Verificar permissões associadas
    console.log('2️⃣ PERMISSÕES ASSOCIADAS:');
    const permissionsResult = await pool.query(`
      SELECT p.id, p.action, p.description, sf.name as feature_name
      FROM permissions p
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.category = 'tipos-documentos'
      ORDER BY p.action
    `);
    
    console.log(`   Total de permissões: ${permissionsResult.rows.length}`);
    permissionsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.action.toUpperCase()} - ${row.description}`);
    });
    console.log('');
    
    // 3. Verificar atribuições a perfis
    console.log('3️⃣ PERFIS COM ACESSO:');
    const rolesResult = await pool.query(`
      SELECT DISTINCT ur.name as role_name, ur.level, COUNT(rp.permission_id) as total_permissions
      FROM user_roles ur
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.category = 'tipos-documentos'
      GROUP BY ur.id, ur.name, ur.level
      ORDER BY ur.level DESC
    `);
    
    rolesResult.rows.forEach(row => {
      console.log(`   👤 ${row.role_name} (Nível ${row.level}) - ${row.total_permissions} permissões`);
    });
    console.log('');
    
    // 4. Verificar usuários afetados
    console.log('4️⃣ USUÁRIOS AFETADOS:');
    const usersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total_users
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.category = 'tipos-documentos'
    `);
    
    console.log(`   Total de usuários com acesso: ${usersResult.rows[0].total_users}\n`);
    
    // 5. Resumo do impacto
    console.log('📊 RESUMO DO IMPACTO:');
    console.log('   ✅ Mover "Tipos de Documentos" para "Painel Administrativo"');
    console.log('   ✅ Remover a opção "Documentos" da sidebar');
    console.log('   ⚠️  A categoria no banco permanecerá "tipos-documentos"');
    console.log('   ⚠️  As permissões NÃO serão alteradas');
    console.log('   ⚠️  Os usuários manterão o mesmo nível de acesso');
    console.log('   ✅ Apenas a organização visual da sidebar mudará\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTiposDocumentosPermissions();



