/**
 * Visualizar Templates de Email - Net Imobiliária
 * Execute: node view-email-templates.js
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

async function viewEmailTemplates() {
  console.log('📧 VISUALIZANDO TEMPLATES DE EMAIL...\n');

  try {
    // 1. Buscar todos os templates
    console.log('1️⃣ Buscando templates de email...');
    
    const templatesQuery = `
      SELECT id, name, subject, html_content, text_content, variables, is_active, created_at
      FROM email_templates 
      ORDER BY name
    `;
    
    const templates = await pool.query(templatesQuery);
    
    console.log(`✅ ${templates.rows.length} templates encontrados:\n`);
    
    // 2. Mostrar cada template
    templates.rows.forEach((template, index) => {
      console.log(`📋 TEMPLATE ${index + 1}: ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Ativo: ${template.is_active ? '✅ Sim' : '❌ Não'}`);
      // Tentar parsear variáveis com tratamento de erro
      let variablesList = 'Nenhuma';
      try {
        if (template.variables) {
          const variables = JSON.parse(template.variables);
          variablesList = Array.isArray(variables) ? variables.join(', ') : String(variables);
        }
      } catch (error) {
        variablesList = `Erro ao parsear: ${template.variables}`;
      }
      
      console.log(`   Variáveis: ${variablesList}`);
      console.log(`   Criado em: ${template.created_at}`);
      console.log('');
      
      // Mostrar preview do HTML (primeiros 200 caracteres)
      const htmlPreview = template.html_content ? template.html_content.substring(0, 200) + '...' : 'Nenhum conteúdo HTML';
      console.log(`   📄 Preview HTML:`);
      console.log(`   ${htmlPreview}`);
      console.log('');
      
      // Mostrar preview do texto (primeiros 200 caracteres)
      const textPreview = template.text_content ? template.text_content.substring(0, 200) + '...' : 'Nenhum conteúdo texto';
      console.log(`   📄 Preview Texto:`);
      console.log(`   ${textPreview}`);
      console.log('');
      console.log('─'.repeat(80));
      console.log('');
    });

    // 3. Salvar templates em arquivos HTML para visualização
    console.log('2️⃣ Salvando templates em arquivos HTML...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Criar diretório para templates
    const templatesDir = 'email-templates-preview';
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir);
    }
    
    templates.rows.forEach(template => {
      // Salvar HTML completo
      const htmlFile = path.join(templatesDir, `${template.name}.html`);
      fs.writeFileSync(htmlFile, template.html_content);
      console.log(`   ✅ ${template.name}.html salvo`);
      
      // Salvar versão com variáveis substituídas (exemplo)
      let htmlWithVars = template.html_content;
      if (template.variables) {
        try {
          const variables = JSON.parse(template.variables);
          if (Array.isArray(variables)) {
            variables.forEach(variable => {
              let exampleValue = '';
              if (variable === 'code') {
                exampleValue = '123456';
              } else if (variable === 'expiration_minutes') {
                exampleValue = '10';
              } else if (variable === 'reset_link') {
                exampleValue = 'https://exemplo.com/reset?token=abc123';
              } else if (variable === 'expiration_hours') {
                exampleValue = '2';
              } else {
                exampleValue = `{{${variable}}}`;
              }
              
              htmlWithVars = htmlWithVars.replace(new RegExp(`{{${variable}}}`, 'g'), exampleValue);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Erro ao processar variáveis do template ${template.name}`);
        }
        
        const htmlWithVarsFile = path.join(templatesDir, `${template.name}_example.html`);
        fs.writeFileSync(htmlWithVarsFile, htmlWithVars);
        console.log(`   ✅ ${template.name}_example.html salvo (com variáveis)`);
      }
    });
    
    console.log('');
    console.log('3️⃣ Arquivos salvos na pasta: email-templates-preview/');
    console.log('');
    console.log('📋 COMO VISUALIZAR:');
    console.log('   1. Abra a pasta "email-templates-preview"');
    console.log('   2. Clique duas vezes nos arquivos .html');
    console.log('   3. Visualize no seu navegador padrão');
    console.log('');
    console.log('📄 ARQUIVOS DISPONÍVEIS:');
    templates.rows.forEach(template => {
      console.log(`   - ${template.name}.html (template original)`);
      console.log(`   - ${template.name}_example.html (com exemplo de variáveis)`);
    });
    console.log('');
    
    // 4. Mostrar configurações de email
    console.log('4️⃣ Configurações de email:');
    
    const settingsQuery = 'SELECT * FROM email_settings WHERE is_active = true LIMIT 1';
    const settings = await pool.query(settingsQuery);
    
    if (settings.rows.length > 0) {
      const emailSettings = settings.rows[0];
      console.log('   ✅ Configurações encontradas:');
      console.log(`   - Host SMTP: ${emailSettings.smtp_host}`);
      console.log(`   - Porta: ${emailSettings.smtp_port}`);
      console.log(`   - Usuário: ${emailSettings.smtp_user}`);
      console.log(`   - Email remetente: ${emailSettings.from_email}`);
      console.log(`   - Nome remetente: ${emailSettings.from_name}`);
    } else {
      console.log('   ❌ Nenhuma configuração de email encontrada');
    }
    
    console.log('');
    console.log('🎯 RESUMO:');
    console.log(`   ✅ ${templates.rows.length} templates carregados`);
    console.log('   ✅ Arquivos HTML salvos para visualização');
    console.log('   ✅ Templates prontos para uso');
    console.log('');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.error('   1. Verifique se o PostgreSQL está rodando');
    console.error('   2. Confirme se as tabelas foram criadas');
    console.error('   3. Verifique se os templates foram inseridos');
  } finally {
    await pool.end();
  }
}

// Executar visualização
viewEmailTemplates();
