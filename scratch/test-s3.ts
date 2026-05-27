
import { isS3Configured, uploadToS3, deleteFromS3 } from '../src/lib/storage/s3-client';

async function testS3() {
  console.log('🔍 Iniciando teste de conectividade S3...');
  
  if (!isS3Configured()) {
    console.error('❌ S3 não está configurado nas variáveis de ambiente.');
    return;
  }

  const testBuffer = Buffer.from('Teste de conectividade Net Imobiliária ' + new Date().toISOString());
  const testKey = `test/connection-test-${Date.now()}.txt`;
  
  console.log(`📤 Tentando upload de teste: ${testKey}`);
  const uploadResult = await uploadToS3(testKey, testBuffer, 'text/plain');
  
  if (uploadResult) {
    console.log('✅ Upload realizado com sucesso!');
    console.log('🔗 URL:', uploadResult.url);
    
    console.log(`🗑️ Tentando deletar arquivo de teste...`);
    const deleted = await deleteFromS3(testKey);
    if (deleted) {
      console.log('✅ Deleção realizada com sucesso!');
      console.log('🚀 CONEXÃO S3 PERFEITA!');
    } else {
      console.warn('⚠️ Falha ao deletar arquivo de teste (mas upload funcionou).');
    }
  } else {
    console.error('❌ Falha no upload para o S3. Verifique as credenciais e o endpoint.');
  }
}

// Para rodar via ts-node ou similar. 
// Como estou no ambiente do sistema, vou disparar via execução direta de script.
testS3();
