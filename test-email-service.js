/**
 * Teste do EmailService - Net Imobiliária
 * Execute: node test-email-service.js
 */

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const nodemailer = require('nodemailer');

// Configuração do pool de conexão
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function testEmailService() {
  console.log('🧪 INICIANDO TESTE DO EMAIL SERVICE...\n');

  try {
    // 1. Verificar configurações de email no banco
    console.log('1️⃣ Verificando configurações de email...');
    const emailSettingsQuery = 'SELECT * FROM email_settings WHERE is_active = true LIMIT 1';
    const emailSettings = await pool.query(emailSettingsQuery);
    
    if (emailSettings.rows.length === 0) {
      console.log('❌ Nenhuma configuração de email encontrada!');
      return;
    }
    
    console.log('✅ Configurações encontradas:');
    console.log(`   Host: ${emailSettings.rows[0].smtp_host}`);
    console.log(`   Port: ${emailSettings.rows[0].smtp_port}`);
    console.log(`   User: ${emailSettings.rows[0].smtp_user}`);
    console.log(`   From: ${emailSettings.rows[0].from_email}\n`);

    // 2. Verificar templates de email
    console.log('2️⃣ Verificando templates de email...');
    const templatesQuery = 'SELECT name, subject FROM email_templates WHERE is_active = true';
    const templates = await pool.query(templatesQuery);
    
    console.log(`✅ ${templates.rows.length} templates encontrados:`);
    templates.rows.forEach(template => {
      console.log(`   - ${template.name}: ${template.subject}`);
    });
    console.log('');

    // 3. Testar conexão SMTP (se credenciais estiverem configuradas)
    console.log('3️⃣ Testando conexão SMTP...');
    
    // Verificar se as variáveis de ambiente estão configuradas
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailPass) {
      console.log('⚠️  Credenciais do Gmail não configuradas!');
      console.log('   Configure as variáveis GMAIL_USER e GMAIL_APP_PASSWORD no arquivo .env.local');
      console.log('   Veja o arquivo CONFIGURACAO_GMAIL.md para instruções\n');
      
      // Mostrar configuração atual do banco
      console.log('📋 CONFIGURAÇÃO ATUAL DO BANCO:');
      console.log(`   SMTP Host: ${emailSettings.rows[0].smtp_host}`);
      console.log(`   SMTP Port: ${emailSettings.rows[0].smtp_port}`);
      console.log(`   SMTP User: ${emailSettings.rows[0].smtp_user}`);
      console.log(`   From Email: ${emailSettings.rows[0].from_email}`);
      console.log(`   From Name: ${emailSettings.rows[0].from_name}\n`);
      
      return;
    }

    // Criar transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.rows[0].smtp_host,
      port: emailSettings.rows[0].smtp_port,
      secure: emailSettings.rows[0].smtp_secure,
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    // Verificar conexão
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso!\n');

    // 4. Teste de envio de email (opcional)
    console.log('4️⃣ Teste de envio de email (opcional)...');
    console.log('   Para enviar um email de teste, descomente o código abaixo\n');
    
    /*
    const testEmail = await transporter.sendMail({
      from: `"${emailSettings.rows[0].from_name}" <${emailSettings.rows[0].from_email}>`,
      to: gmailUser,
      subject: 'Teste - Net Imobiliária Email Service',
      html: `
        <h2>🎉 Email Service Funcionando!</h2>
        <p>O sistema de email da Net Imobiliária está configurado e funcionando corretamente.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Servidor SMTP:</strong> ${emailSettings.rows[0].smtp_host}:${emailSettings.rows[0].smtp_port}</p>
      `
    });
    
    console.log('✅ Email de teste enviado com sucesso!');
    console.log(`   Message ID: ${testEmail.messageId}\n`);
    */

    console.log('🎯 RESUMO DO TESTE:');
    console.log('   ✅ Configurações de email: OK');
    console.log('   ✅ Templates de email: OK');
    console.log('   ✅ Conexão SMTP: OK');
    console.log('   ✅ EmailService: Pronto para uso!\n');

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.error('   1. Verifique se o PostgreSQL está rodando');
    console.error('   2. Confirme as credenciais do Gmail no .env.local');
    console.error('   3. Verifique se a senha de app está correta');
    console.error('   4. Confirme se a verificação em 2 etapas está ativada');
  } finally {
    await pool.end();
  }
}

// Executar teste
testEmailService();
