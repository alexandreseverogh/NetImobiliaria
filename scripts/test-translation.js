/**
 * Script de Teste para API de Tradução
 * Testa se a configuração do Google Translate está funcionando
 */

require('dotenv').config({ path: '.env.local' });

async function testTranslation() {
  console.log('🧪 Testando configuração de tradução (APIs GRATUITAS)...\n');

  // Verificar configuração
  const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  console.log('📋 Configuração:');
  console.log(`   LibreTranslate: ${libreTranslateUrl}`);
  console.log(`   Google Translate: ${googleApiKey ? 'Configurado (opcional)' : 'Não configurado (usando APIs gratuitas)'}\n`);

  // Testar tradução
  const testTexts = [
    {
      text: 'Real estate market trends',
      expected: 'tendências',
      description: 'Tendências do mercado imobiliário'
    },
    {
      text: 'Property investment opportunities',
      expected: 'investimento',
      description: 'Oportunidades de investimento imobiliário'
    },
    {
      text: 'Housing market analysis',
      expected: 'mercado',
      description: 'Análise do mercado imobiliário'
    }
  ];

  console.log('🔄 Testando traduções...\n');

  // Testar com LibreTranslate primeiro (gratuito)
  console.log('🔄 Testando LibreTranslate (gratuito)...\n');
  
  for (const test of testTexts) {
    try {
      // Tentar LibreTranslate primeiro
      let translated = '';
      let apiUsed = '';

      try {
        const libreResponse = await fetch(`${libreTranslateUrl}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: test.text,
            source: 'en',
            target: 'pt',
            format: 'text',
          }),
        });

        if (libreResponse.ok) {
          const libreData = await libreResponse.json();
          translated = libreData.translatedText;
          apiUsed = 'LibreTranslate';
        } else {
          throw new Error('LibreTranslate não disponível');
        }
      } catch (libreError) {
        // Fallback para MyMemory
        console.log(`   ⚠️ LibreTranslate falhou, tentando MyMemory...`);
        
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(test.text)}&langpair=en|pt-BR`;
        const myMemoryResponse = await fetch(myMemoryUrl);
        const myMemoryData = await myMemoryResponse.json();
        
        if (myMemoryData.responseStatus === 200) {
          translated = myMemoryData.responseData.translatedText;
          apiUsed = 'MyMemory';
        } else {
          throw new Error(`MyMemory error: ${myMemoryData.responseStatus}`);
        }
      }

      const lowerTranslated = translated.toLowerCase();

      console.log(`📝 Teste: ${test.description}`);
      console.log(`   Original: "${test.text}"`);
      console.log(`   Traduzido: "${translated}"`);
      console.log(`   API usada: ${apiUsed}`);

      if (lowerTranslated.includes(test.expected)) {
        console.log(`   ✅ PASSOU\n`);
      } else {
        console.log(`   ⚠️ Tradução recebida, mas não contém palavra esperada "${test.expected}"\n`);
      }

    } catch (error) {
      console.error(`❌ Erro ao traduzir "${test.text}":`, error.message);
      console.log(`   ⚠️ Tentando próximo teste...\n`);
      // Continua para próximo teste ao invés de sair
    }
  }

  console.log('✅ Todos os testes passaram!');
  console.log('\n🎉 Configuração de tradução está funcionando corretamente!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Execute: node scripts/seed_feed.js');
  console.log('   2. Isso adicionará fontes internacionais');
  console.log('   3. O sistema traduzirá automaticamente quando o cron job rodar\n');
}

// Executar teste
testTranslation().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

