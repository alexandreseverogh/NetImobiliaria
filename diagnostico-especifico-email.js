// Diagnóstico específico para identificar problema no emailService.ts
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function diagnosticoEspecifico() {
  console.log('🔍 DIAGNÓSTICO ESPECÍFICO DO EMAILSERVICE.TS\n');

  try {
    const client = await pool.connect();
    console.log('✅ Conexão com banco estabelecida\n');

    // 1. Verificar estrutura da tabela email_settings
    console.log('1️⃣ ESTRUTURA DA TABELA email_settings:');
    const structureQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'email_settings' 
      ORDER BY ordinal_position
    `;
    const structureResult = await client.query(structureQuery);
    
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');

    // 2. Verificar dados atuais
    console.log('2️⃣ DADOS ATUAIS EM email_settings:');
    const dataQuery = 'SELECT * FROM email_settings WHERE is_active = true LIMIT 1';
    const dataResult = await client.query(dataQuery);
    
    if (dataResult.rows.length === 0) {
      console.log('❌ Nenhum registro ativo encontrado');
    } else {
      const settings = dataResult.rows[0];
      console.log('✅ Registro encontrado:');
      Object.keys(settings).forEach(key => {
        const value = settings[key];
        if (key === 'smtp_password') {
          console.log(`   ${key}: ${value ? '***DEFINIDO***' : 'NULL'}`);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      });
    }
    console.log('');

    // 3. Verificar template 2fa-code
    console.log('3️⃣ TEMPLATE 2fa-code:');
    const templateQuery = "SELECT * FROM email_templates WHERE name = '2fa-code'";
    const templateResult = await client.query(templateQuery);
    
    if (templateResult.rows.length === 0) {
      console.log('❌ Template 2fa-code não encontrado');
    } else {
      const template = templateResult.rows[0];
      console.log('✅ Template encontrado:');
      console.log(`   ID: ${template.id}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Active: ${template.is_active}`);
      console.log(`   HTML Length: ${template.html_content ? template.html_content.length : 0}`);
    }
    console.log('');

    // 4. Testar a query exata do emailService.ts
    console.log('4️⃣ TESTANDO QUERY DO EMAILSERVICE.TS:');
    try {
      const exactQuery = 'SELECT * FROM email_settings WHERE is_active = true LIMIT 1';
      const exactResult = await client.query(exactQuery);
      
      if (exactResult.rows.length > 0) {
        const settings = exactResult.rows[0];
        console.log('✅ Query funciona, dados carregados:');
        
        // Simular o que o emailService.ts faz
        const config = {
          host: settings.smtp_host,
          port: settings.smtp_port,
          secure: settings.smtp_secure,
          auth: {
            user: settings.smtp_username, // ← AQUI ESTÁ O PROBLEMA!
            pass: settings.smtp_password
          },
          from: settings.from_email,
          fromName: settings.from_name
        };
        
        console.log('✅ Configuração simulada:');
        console.log(`   Host: ${config.host}`);
        console.log(`   Port: ${config.port}`);
        console.log(`   Secure: ${config.secure}`);
        console.log(`   Auth User: ${config.auth.user ? 'DEFINIDO' : 'UNDEFINED'}`);
        console.log(`   Auth Pass: ${config.auth.pass ? 'DEFINIDO' : 'UNDEFINED'}`);
        console.log(`   From: ${config.from}`);
        console.log(`   FromName: ${config.fromName}`);
        
        // Verificar se o problema está na coluna
        if (!settings.smtp_username) {
          console.log('\n🚨 PROBLEMA IDENTIFICADO:');
          console.log('   O código usa settings.smtp_username');
          console.log('   Mas a coluna pode ter nome diferente!');
          console.log('   Verificar se é smtp_user vs smtp_username');
        }
        
      } else {
        console.log('❌ Query não retorna dados');
      }
    } catch (queryError) {
      console.log('❌ Erro na query:', queryError.message);
    }

    await client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error.message);
    await pool.end();
    process.exit(1);
  }
}

diagnosticoEspecifico().catch(console.error);


