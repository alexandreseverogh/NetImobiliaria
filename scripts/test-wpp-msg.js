require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({ host: 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres' });

function normalizePhone(raw) {
  let phone = raw.replace(/\D/g, '');
  if (phone.length === 13 && phone.startsWith('55')) {
    phone = phone.slice(0, 4) + phone.slice(5);
  }
  return phone;
}

const fmtBRL = (cents) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

async function main() {
  const r = await pool.query(
    "SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp FROM public.tenants WHERE id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'"
  );
  pool.end();
  const c = r.rows[0];

  const phone = normalizePhone(c.numero_whatsapp);
  console.log('Enviando para:', phone);
  console.log('Instância:', c.evolution_instance);

  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' });

  const message =
    `🤖 *Resumo do Ciclo* — Marketing Digital\n` +
    `👤 *Cliente Teste*\n` +
    `--------------------\n` +
    `📈 *Campanha Residencial Premium*\n` +
    `   💰 ${fmtBRL(5000)} -> *${fmtBRL(6000)}* (+20%)\n` +
    `   🔐 PIN: *123456*\n` +
    `   ✅ http://192.168.15.10:3000/admin/campanhas/aprovacoes\n` +
    `⏸️ Campanha Lançamento Julho  (${fmtBRL(3000)}/dia)\n` +
    `   CPL crítico atingido — pausada automaticamente\n` +
    `--------------------\n` +
    `💰 *Impacto financeiro (diário)*\n` +
    `   ⏸️ Economia pausas:  ${fmtBRL(3000)}/dia\n` +
    `   📈 Incremento scale: +${fmtBRL(1000)}/dia\n` +
    `   ✅ Auto-financiado (+${fmtBRL(2000)}/dia de sobra)\n` +
    `\n_Enviado em: ${now}_`;

  try {
    const resp = await axios.post(
      `${c.evolution_api_url}/message/sendText/${c.evolution_instance}`,
      { number: phone, text: message, linkPreview: false },
      { headers: { 'Content-Type': 'application/json', apikey: c.evolution_api_key }, timeout: 15000 }
    );
    console.log('Enviado! Status:', resp.status, JSON.stringify(resp.data).slice(0, 200));
  } catch (e) {
    console.error('Erro:', e.response?.status, JSON.stringify(e.response?.data ?? e.message));
  }
}

main().catch(console.error);
