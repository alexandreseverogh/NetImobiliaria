const fs = require('fs');
const path = require('path');

/**
 * Script para testar o carregamento do arquivo de municípios
 */

const MUNICIPIOS_FILE = path.join(__dirname, '..', 'src', 'lib', 'admin', 'municipios.json');

console.log('🧪 Testando carregamento de municípios...');

try {
  // 1. Verificar se o arquivo existe
  if (!fs.existsSync(MUNICIPIOS_FILE)) {
    console.error('❌ Arquivo de municípios não encontrado!');
    process.exit(1);
  }

  // 2. Ler e parsear o arquivo
  console.log('📖 Lendo arquivo...');
  const rawData = fs.readFileSync(MUNICIPIOS_FILE, 'utf8');
  const municipiosData = JSON.parse(rawData);

  // 3. Validar estrutura
  console.log('🔍 Validando estrutura...');
  
  if (!municipiosData.estados || !Array.isArray(municipiosData.estados)) {
    console.error('❌ Propriedade "estados" não encontrada ou não é array');
    process.exit(1);
  }

  const totalEstados = municipiosData.estados.length;
  const totalMunicipios = municipiosData.estados.reduce((total, estado) => total + estado.municipios.length, 0);

  console.log('✅ Estrutura válida!');
  console.log(`📊 Estatísticas:`);
  console.log(`   - Estados: ${totalEstados}`);
  console.log(`   - Municípios: ${totalMunicipios}`);

  // 4. Testar alguns estados específicos
  console.log('\n🔍 Testando estados específicos:');
  
  const estadosTeste = ['SP', 'RJ', 'MG', 'DF', 'GO'];
  estadosTeste.forEach(sigla => {
    const estado = municipiosData.estados.find(e => e.sigla === sigla);
    if (estado) {
      console.log(`   ✅ ${sigla} (${estado.nome}): ${estado.municipios.length} municípios`);
    } else {
      console.log(`   ❌ ${sigla}: Estado não encontrado`);
    }
  });

  // 5. Testar alguns municípios específicos
  console.log('\n🔍 Testando municípios específicos:');
  
  const municipiosTeste = [
    { estado: 'SP', municipio: 'São Paulo' },
    { estado: 'RJ', municipio: 'Rio de Janeiro' },
    { estado: 'MG', municipio: 'Belo Horizonte' },
    { estado: 'DF', municipio: 'Brasília' },
    { estado: 'GO', municipio: 'Goiânia' }
  ];

  municipiosTeste.forEach(({ estado: sigla, municipio }) => {
    const estado = municipiosData.estados.find(e => e.sigla === sigla);
    if (estado) {
      const encontrado = estado.municipios.includes(municipio);
      console.log(`   ${encontrado ? '✅' : '❌'} ${municipio} (${sigla}): ${encontrado ? 'Encontrado' : 'Não encontrado'}`);
    }
  });

  console.log('\n🎉 Teste concluído com sucesso!');

} catch (error) {
  console.error('❌ Erro durante o teste:', error.message);
  process.exit(1);
}











