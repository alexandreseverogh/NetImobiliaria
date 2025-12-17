// Teste simples do sistema híbrido de email
const emailService = require('./src/services/emailServiceHybrid').default;

async function testEmailHybrid() {
  console.log('🧪 TESTANDO SISTEMA HÍBRIDO DE EMAIL\n');

  try {
    console.log('1️⃣ Inicializando serviço...');
    await emailService.sendTemplateEmail('test@example.com', '2fa-code', { code: '123456' });
    console.log('✅ Teste concluído com sucesso!');
    
    console.log('\n📋 RESULTADO:');
    console.log('- Se apareceu "inicializado dinamicamente": Sistema dinâmico funcionando');
    console.log('- Se apareceu "fallback hardcoded": Sistema usando backup');
    console.log('- Se não deu erro: Email service funcionando!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
  
  process.exit(0);
}

testEmailHybrid();


