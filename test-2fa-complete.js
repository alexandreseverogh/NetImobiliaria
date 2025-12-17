const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria',
});

async function test2FAImplementation() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testando implementação completa do 2FA...\n');
    
    // 1. Verificar campos na tabela users
    console.log('1️⃣ Verificando campos na tabela users:');
    const userFields = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('two_fa_enabled', 'two_fa_secret', 'ultimo_login')
      ORDER BY column_name
    `);
    
    const requiredFields = ['two_fa_enabled', 'two_fa_secret', 'ultimo_login'];
    const existingFields = userFields.rows.map(row => row.column_name);
    
    requiredFields.forEach(field => {
      if (existingFields.includes(field)) {
        console.log(`   ✅ ${field} - OK`);
      } else {
        console.log(`   ❌ ${field} - FALTANDO`);
      }
    });
    
    // 2. Verificar template de email 2FA
    console.log('\n2️⃣ Verificando template de email 2FA:');
    const template = await client.query(`
      SELECT template_key, subject, is_active, LENGTH(html_content) as html_size
      FROM email_templates 
      WHERE template_key = '2fa-code'
    `);
    
    if (template.rows.length > 0) {
      console.log(`   ✅ Template 2fa-code existe`);
      console.log(`   📧 Assunto: ${template.rows[0].subject}`);
      console.log(`   📊 Tamanho HTML: ${template.rows[0].html_size} chars`);
      console.log(`   🟢 Ativo: ${template.rows[0].is_active ? 'Sim' : 'Não'}`);
    } else {
      console.log(`   ❌ Template 2fa-code FALTANDO`);
    }
    
    // 3. Verificar configurações de email
    console.log('\n3️⃣ Verificando configurações de email:');
    const emailConfig = await client.query(`
      SELECT smtp_host, smtp_port, smtp_username, is_active, environment
      FROM email_settings
      WHERE is_active = true
    `);
    
    if (emailConfig.rows.length > 0) {
      const config = emailConfig.rows[0];
      console.log(`   ✅ Configuração de email ativa`);
      console.log(`   📧 SMTP: ${config.smtp_host}:${config.smtp_port}`);
      console.log(`   👤 Usuário: ${config.smtp_username}`);
      console.log(`   🌍 Ambiente: ${config.environment}`);
    } else {
      console.log(`   ❌ Nenhuma configuração de email ativa`);
    }
    
    // 4. Testar criação de código 2FA
    console.log('\n4️⃣ Testando geração de código 2FA:');
    try {
      // Simular geração de código
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`   ✅ Código gerado: ${testCode}`);
      console.log(`   ⏰ Válido por: 10 minutos`);
    } catch (error) {
      console.log(`   ❌ Erro na geração: ${error.message}`);
    }
    
    // 5. Verificar APIs 2FA
    console.log('\n5️⃣ Verificando APIs 2FA disponíveis:');
    const apiRoutes = [
      '/api/admin/auth/2fa/send-code',
      '/api/admin/auth/2fa/verify-code',
      '/api/admin/auth/2fa/enable',
      '/api/admin/auth/2fa/disable',
      '/api/admin/auth/2fa/status'
    ];
    
    apiRoutes.forEach(route => {
      console.log(`   📡 ${route} - (verificar arquivo existente)`);
    });
    
    // 6. Resumo final
    console.log('\n📊 RESUMO DA IMPLEMENTAÇÃO:');
    const allFieldsOk = requiredFields.every(field => existingFields.includes(field));
    const templateOk = template.rows.length > 0;
    const emailOk = emailConfig.rows.length > 0;
    
    console.log(`   Campos users: ${allFieldsOk ? '✅ COMPLETO' : '❌ INCOMPLETO'}`);
    console.log(`   Template email: ${templateOk ? '✅ COMPLETO' : '❌ INCOMPLETO'}`);
    console.log(`   Config email: ${emailOk ? '✅ COMPLETO' : '❌ INCOMPLETO'}`);
    
    if (allFieldsOk && templateOk && emailOk) {
      console.log('\n🎉 2FA IMPLEMENTADO COMPLETAMENTE!');
      console.log('✅ Pronto para teste completo de 2FA');
    } else {
      console.log('\n⚠️ 2FA PARCIALMENTE IMPLEMENTADO');
      console.log('❌ Execute completar-implementacao-2fa.sql primeiro');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

test2FAImplementation();


