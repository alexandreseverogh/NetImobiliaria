// Teste direto do 2FA no banco de dados
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function test2FADatabase() {
  try {
    console.log('🔍 Testando 2FA no banco de dados...\n');

    // 1. Verificar usuários com 2FA habilitado
    console.log('1. Verificando usuários com 2FA habilitado:');
    const usersQuery = `
      SELECT id, username, email, two_fa_enabled 
      FROM users 
      WHERE two_fa_enabled = true
      ORDER BY username
    `;
    
    const usersResult = await pool.query(usersQuery);
    console.log('📊 Usuários com 2FA habilitado:', usersResult.rows.length);
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ID: ${user.id}`);
    });

    // 2. Verificar template de email 2FA
    console.log('\n2. Verificando template de email 2FA:');
    const templateQuery = `
      SELECT id, name, subject, content 
      FROM email_templates 
      WHERE name = '2fa-code'
    `;
    
    const templateResult = await pool.query(templateQuery);
    if (templateResult.rows.length > 0) {
      console.log('✅ Template 2FA encontrado:');
      console.log(`   - ID: ${templateResult.rows[0].id}`);
      console.log(`   - Subject: ${templateResult.rows[0].subject}`);
    } else {
      console.log('❌ Template 2FA não encontrado!');
    }

    // 3. Verificar configuração SMTP
    console.log('\n3. Verificando configuração SMTP:');
    const smtpQuery = `
      SELECT setting_key, setting_value 
      FROM email_settings 
      WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_username', 'smtp_password')
    `;
    
    const smtpResult = await pool.query(smtpQuery);
    console.log('📧 Configuração SMTP:');
    smtpResult.rows.forEach(row => {
      const value = row.setting_key.includes('password') ? '***' : row.setting_value;
      console.log(`   - ${row.setting_key}: ${value}`);
    });

    // 4. Verificar códigos 2FA recentes
    console.log('\n4. Verificando códigos 2FA recentes:');
    const codesQuery = `
      SELECT user_id, code, method, created_at, expires_at, used
      FROM user_2fa_codes 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const codesResult = await pool.query(codesQuery);
    console.log('🔐 Códigos 2FA recentes:', codesResult.rows.length);
    codesResult.rows.forEach(code => {
      console.log(`   - User ID: ${code.user_id}, Code: ${code.code}, Used: ${code.used}, Created: ${code.created_at}`);
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

test2FADatabase();


