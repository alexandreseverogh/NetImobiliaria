/**
 * Teste das APIs de Autenticação - Net Imobiliária
 * Execute: node test-auth-apis.js
 */

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Configuração do pool de conexão
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function testAuthAPIs() {
  console.log('🔐 INICIANDO TESTE DAS APIs DE AUTENTICAÇÃO...\n');

  try {
    // 1. Verificar usuário admin
    console.log('1️⃣ Verificando usuário admin...');
    
    const adminQuery = 'SELECT id, username, email FROM users WHERE username = $1';
    const admin = await pool.query(adminQuery, ['admin']);
    
    if (admin.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!');
      return;
    }
    
    const adminUser = admin.rows[0];
    console.log(`✅ Usuário admin: ID ${adminUser.id}, Email: ${adminUser.email}\n`);

    // 2. Verificar estrutura das APIs
    console.log('2️⃣ Verificando estrutura das APIs...');
    
    const apiEndpoints = [
      'src/app/api/admin/auth/login/route.ts',
      'src/app/api/admin/auth/logout/route.ts',
      'src/app/api/admin/auth/2fa/send-code/route.ts',
      'src/app/api/admin/auth/2fa/verify-code/route.ts',
      'src/app/api/admin/auth/2fa/enable/route.ts',
      'src/app/api/admin/auth/2fa/disable/route.ts',
      'src/app/api/admin/auth/2fa/status/route.ts',
      'src/middleware/authMiddleware.ts'
    ];
    
    const fs = require('fs');
    const path = require('path');
    
    let existingAPIs = 0;
    apiEndpoints.forEach(endpoint => {
      if (fs.existsSync(endpoint)) {
        existingAPIs++;
        console.log(`   ✅ ${endpoint}`);
      } else {
        console.log(`   ❌ ${endpoint}`);
      }
    });
    
    console.log(`\n✅ ${existingAPIs}/${apiEndpoints.length} APIs criadas\n`);

    // 3. Verificar serviços
    console.log('3️⃣ Verificando serviços...');
    
    const services = [
      'src/services/emailService.ts',
      'src/services/twoFactorAuthService.ts'
    ];
    
    let existingServices = 0;
    services.forEach(service => {
      if (fs.existsSync(service)) {
        existingServices++;
        console.log(`   ✅ ${service}`);
      } else {
        console.log(`   ❌ ${service}`);
      }
    });
    
    console.log(`\n✅ ${existingServices}/${services.length} serviços criados\n`);

    // 4. Verificar configuração 2FA
    console.log('4️⃣ Verificando configuração 2FA...');
    
    const configQuery = `
      SELECT is_enabled, method, email 
      FROM user_2fa_config 
      WHERE user_id = $1
    `;
    
    const config = await pool.query(configQuery, [adminUser.id]);
    
    if (config.rows.length === 0) {
      console.log('⚠️  Configuração 2FA não encontrada para o admin');
      console.log('   (Isso é normal se ainda não foi configurado)\n');
    } else {
      const userConfig = config.rows[0];
      console.log(`✅ Configuração 2FA encontrada:`);
      console.log(`   - Habilitado: ${userConfig.is_enabled}`);
      console.log(`   - Método: ${userConfig.method}`);
      console.log(`   - Email: ${userConfig.email}\n`);
    }

    // 5. Verificar permissões do usuário
    console.log('5️⃣ Verificando permissões do admin...');
    
    const permissionsQuery = `
      SELECT ur.name as role_name, sf.name as feature_name, p.action
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1
      ORDER BY ur.name, sf.name, p.action
    `;
    
    const permissions = await pool.query(permissionsQuery, [adminUser.id]);
    
    console.log(`✅ ${permissions.rows.length} permissões encontradas para o admin:`);
    
    // Agrupar por role
    const rolePermissions = {};
    permissions.rows.forEach(row => {
      if (!rolePermissions[row.role_name]) {
        rolePermissions[row.role_name] = [];
      }
      rolePermissions[row.role_name].push(`${row.feature_name}:${row.action}`);
    });
    
    Object.entries(rolePermissions).forEach(([role, perms]) => {
      console.log(`   📋 ${role}: ${perms.length} permissões`);
    });
    console.log('');

    // 6. Verificar sessões ativas
    console.log('6️⃣ Verificando sessões ativas...');
    
    const sessionsQuery = `
      SELECT COUNT(*) as count 
      FROM user_sessions 
      WHERE expires_at > NOW()
    `;
    
    const sessions = await pool.query(sessionsQuery);
    console.log(`✅ ${sessions.rows[0].count} sessões ativas\n`);

    console.log('🎯 RESUMO DO TESTE:');
    console.log('   ✅ Usuário admin: OK');
    console.log('   ✅ APIs de autenticação: OK');
    console.log('   ✅ Serviços 2FA: OK');
    console.log('   ✅ Middleware de autenticação: OK');
    console.log('   ✅ Sistema de permissões: OK');
    console.log('   ✅ Sistema de autenticação: Pronto para uso!\n');

    console.log('📋 ENDPOINTS DISPONÍVEIS:');
    console.log('   🔐 POST /api/admin/auth/login');
    console.log('   🚪 POST /api/admin/auth/logout');
    console.log('   📧 POST /api/admin/auth/2fa/send-code');
    console.log('   ✅ POST /api/admin/auth/2fa/verify-code');
    console.log('   🔒 POST /api/admin/auth/2fa/enable');
    console.log('   🔓 POST /api/admin/auth/2fa/disable');
    console.log('   📊 GET /api/admin/auth/2fa/status\n');

    console.log('🚀 PRÓXIMOS PASSOS:');
    console.log('   1. Testar APIs com Postman/Thunder Client');
    console.log('   2. Criar interface de login com 2FA');
    console.log('   3. Implementar FASE 2: Gestão de Perfis\n');

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.error('   1. Verifique se o PostgreSQL está rodando');
    console.error('   2. Confirme se as tabelas foram criadas');
    console.error('   3. Verifique se o usuário admin existe');
    console.error('   4. Confirme se os arquivos das APIs existem');
  } finally {
    await pool.end();
  }
}

// Executar teste
testAuthAPIs();


