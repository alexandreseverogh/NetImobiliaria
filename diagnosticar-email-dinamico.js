// Script para diagnosticar problemas no sistema de email dinâmico
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function diagnosticarEmail() {
  console.log('🔍 DIAGNÓSTICO DO SISTEMA DE EMAIL DINÂMICO\n');

  try {
    // 1. Testar conexão com banco
    console.log('1️⃣ Testando conexão com banco de dados...');
    const client = await pool.connect();
    console.log('✅ Conexão com banco estabelecida\n');

    // 2. Verificar tabela email_settings
    console.log('2️⃣ Verificando tabela email_settings...');
    const emailSettingsQuery = 'SELECT * FROM email_settings LIMIT 1';
    const emailSettingsResult = await client.query(emailSettingsQuery);
    
    if (emailSettingsResult.rows.length === 0) {
      console.log('❌ Nenhuma configuração encontrada em email_settings');
      console.log('📝 Solução: Execute configurar-email-dinamico-completo.sql\n');
    } else {
      const settings = emailSettingsResult.rows[0];
      console.log('✅ Configuração encontrada:');
      console.log(`   Host: ${settings.smtp_host}`);
      console.log(`   Port: ${settings.smtp_port}`);
      console.log(`   Secure: ${settings.smtp_secure}`);
      console.log(`   Username: ${settings.smtp_username ? '✅ Definido' : '❌ NULL'}`);
      console.log(`   Password: ${settings.smtp_password ? '✅ Definido' : '❌ NULL'}`);
      console.log(`   From Email: ${settings.from_email}`);
      console.log(`   From Name: ${settings.from_name}`);
      console.log(`   Active: ${settings.is_active}\n`);
      
      // Verificar se credenciais estão vazias
      if (!settings.smtp_username || !settings.smtp_password) {
        console.log('⚠️ PROBLEMA IDENTIFICADO: Credenciais SMTP estão NULL ou vazias!');
        console.log('📝 Solução: Execute configurar-email-dinamico-completo.sql com credenciais corretas\n');
      }
    }

    // 3. Verificar template 2fa-code
    console.log('3️⃣ Verificando template 2fa-code...');
    const templateQuery = "SELECT name, subject, is_active, html_content FROM email_templates WHERE name = '2fa-code'";
    const templateResult = await client.query(templateQuery);
    
    if (templateResult.rows.length === 0) {
      console.log('❌ Template 2fa-code não encontrado');
      console.log('📝 Solução: Execute configurar-email-dinamico-completo.sql\n');
    } else {
      const template = templateResult.rows[0];
      console.log('✅ Template encontrado:');
      console.log(`   Name: ${template.name}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Active: ${template.is_active}`);
      console.log(`   HTML Length: ${template.html_content ? template.html_content.length : 0} chars\n`);
    }

    // 4. Testar configuração SMTP (sem envio real)
    console.log('4️⃣ Testando configuração SMTP...');
    if (emailSettingsResult.rows.length > 0) {
      const settings = emailSettingsResult.rows[0];
      
      if (settings.smtp_username && settings.smtp_password) {
        console.log('✅ Credenciais SMTP encontradas, testando configuração...');
        
        const nodemailer = require('nodemailer');
        const testTransporter = nodemailer.createTransporter({
          host: settings.smtp_host,
          port: settings.smtp_port,
          secure: settings.smtp_secure,
          auth: {
            user: settings.smtp_username,
            pass: settings.smtp_password
          }
        });

        try {
          await testTransporter.verify();
          console.log('✅ Configuração SMTP válida e funcional\n');
        } catch (smtpError) {
          console.log('❌ Erro na configuração SMTP:');
          console.log(`   ${smtpError.message}\n`);
          
          if (smtpError.code === 'EAUTH') {
            console.log('🔑 SOLUÇÃO PARA EAUTH:');
            console.log('   1. Verifique se o email está correto');
            console.log('   2. Use senha de APP do Gmail, não a senha normal');
            console.log('   3. Gere nova senha em: https://myaccount.google.com/apppasswords');
            console.log('   4. Execute novamente configurar-email-dinamico-completo.sql\n');
          }
        }
      } else {
        console.log('❌ Credenciais SMTP ausentes, não é possível testar\n');
      }
    }

    // 5. Verificar se as tabelas existem
    console.log('5️⃣ Verificando estrutura das tabelas...');
    
    const tablesToCheck = ['email_settings', 'email_templates', 'email_logs'];
    for (const table of tablesToCheck) {
      try {
        const checkQuery = `SELECT COUNT(*) as count FROM ${table}`;
        await client.query(checkQuery);
        console.log(`✅ Tabela ${table} existe`);
      } catch (error) {
        console.log(`❌ Tabela ${table} não existe: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMO DO DIAGNÓSTICO:');
    
    if (emailSettingsResult.rows.length === 0 || !emailSettingsResult.rows[0].smtp_username) {
      console.log('❌ PROBLEMA: email_settings não configurado');
      console.log('🔧 SOLUÇÃO: Execute configurar-email-dinamico-completo.sql');
    } else if (templateResult.rows.length === 0) {
      console.log('❌ PROBLEMA: Template 2fa-code não existe');
      console.log('🔧 SOLUÇÃO: Execute configurar-email-dinamico-completo.sql');
    } else {
      console.log('✅ Configuração básica OK, verificando credenciais...');
    }

    await client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error.message);
    console.log('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verifique se o banco de dados está rodando');
    console.log('2. Verifique as credenciais de conexão com o banco');
    console.log('3. Execute: npm install pg');
    
    await pool.end();
    process.exit(1);
  }
}

// Executar diagnóstico
diagnosticarEmail().catch(console.error);


