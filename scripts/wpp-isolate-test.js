// Diagnóstico: isola qual fator quebra a renderização no WhatsApp mobile.
// Envia 4 mensagens distintas. Usuário reporta quais aparecem no CELULAR.
const axios = require('axios');
const fs = require('fs');

const API_URL  = 'http://localhost:8081';
const INSTANCE = 'trafegopago-wpp';
const API_KEY  = fs.readFileSync(__dirname + '/.evokey', 'utf8').trim();
const NUMBER   = '558198000047';

async function send(label, text) {
  try {
    const res = await axios.post(
      `${API_URL}/message/sendText/${INSTANCE}`,
      { number: NUMBER, text },
      { headers: { 'Content-Type': 'application/json', apikey: API_KEY } },
    );
    console.log(`${label}: status=${res.status} key=${res.data?.key?.id ?? '?'} len=${text.length}`);
  } catch (e) {
    console.log(`${label}: ERRO ${e.response?.status} ${JSON.stringify(e.response?.data || e.message)}`);
  }
}

(async () => {
  // A — texto puro, sem URL, sem markdown, sem emoji
  await send('A', 'TESTE A — texto puro simples sem nada especial');

  // B — curto COM url localhost (testa link preview / extendedTextMessage)
  await send('B', 'TESTE B — com link http://localhost:3001/api/agent/approve/teste-123');

  // C — emojis + *negrito* + varias quebras de linha, SEM url
  await send('C',
    'TESTE C — formatacao\n' +
    '🤖 *Agente* 📈💰✅❌⏸️📉⚡📲\n' +
    '👤 *Cliente*\n📊 Campanha\n💰 R$ 50 -> *R$ 65*\n🔐 PIN: *123456*');

  // D — longo (~repete bloco) COM urls = estrutura real do digest
  let d = 'TESTE D — longo com urls\n🤖 *Resumo do Ciclo*\n\n';
  for (let i = 1; i <= 8; i++) {
    d += `📈 *ESCALA ${i}*\n--------------------\n`;
    d += `👤 *Cliente ${i}*\n📊 Campanha exemplo ${i}\n`;
    d += `💰 Orcamento: R$ 50 -> *R$ 65* (+30%)\n`;
    d += `🔐 PIN: *48271${i}*\n`;
    d += `✅ http://localhost:3001/api/agent/approve/95a2608e-54d6-42f4-8192-c8f65aae8fc${i}\n`;
    d += `❌ http://localhost:3001/api/agent/reject/95a2608e-54d6-42f4-8192-c8f65aae8fc${i}\n\n`;
  }
  await send('D', d);

  console.log('\nVerifique no CELULAR quais (A/B/C/D) apareceram com conteudo.');
})();
