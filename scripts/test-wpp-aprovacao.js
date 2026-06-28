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

async function shorten(url) {
  try {
    const r = await axios.get('https://tinyurl.com/api-create.php', { params: { url }, timeout: 8000 });
    return r.data && r.data.startsWith('http') ? r.data.trim() : url;
  } catch {
    return url;
  }
}

async function main() {
  // Busca config do tenant
  const r = await pool.query(
    "SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp FROM public.tenants WHERE id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'"
  );

  // Busca ações SCALE pendentes
  const actions = await pool.query(`
    SELECT a.id, a."campaignName", a.approval_pin,
           COALESCE(SUM(ads."dailyBudget"), 0)::int AS current_budget
    FROM campanhasmarketingdigital."AgentAction" a
    LEFT JOIN campanhasmarketingdigital."AdSet" ads ON ads."campaignId" = a."campaignId"
    WHERE a.status = 'PENDING_APPROVAL'
      AND a.type = 'SCALE'
      AND a.approval_pin_exp > NOW()
    GROUP BY a.id, a."campaignName", a.approval_pin
    ORDER BY a."createdAt" DESC
    LIMIT 3
  `);
  pool.end();

  const c = r.rows[0];
  const phone = normalizePhone(c.numero_whatsapp);
  const localBase = 'https://steering-directive-specifically-buf.trycloudflare.com';

  if (actions.rows.length === 0) {
    console.log('Nenhuma ação SCALE pendente válida encontrada.');
    return;
  }

  console.log('Encurtando URLs via TinyURL...');

  console.log('Enviando', actions.rows.length, 'ação(ões) para', phone);

  for (const action of actions.rows) {
    const currentFmt = action.current_budget > 0 ? fmtBRL(action.current_budget) : 'N/D';

    const approveUrl = localBase + '/api/agent/approve/' + action.id;
    const rejectUrl  = localBase + '/api/agent/reject/'  + action.id;

    // Mensagem 1: texto puro (sem URL) — nunca é filtrada
    const msgTexto = [
      '🤖 *Agente Tráfego Pago — Aprovação Necessária*',
      '',
      '📊 *' + action.campaignName + '*',
      '💡 Escalar Investimento',
      '💰 Budget atual: ' + currentFmt + '/dia',
      '🔐 PIN: *' + action.approval_pin + '*',
      '',
      '👇 Toque no link abaixo para aprovar e definir o valor:',
    ].join('\n');

    // Mensagem 2: URL sozinha (sem texto ao redor)
    const msgUrl = approveUrl;

    // Mensagem 3: rejeitar
    const msgRejeitar = '❌ Rejeitar: ' + rejectUrl;

    const mensagens = [msgTexto, msgUrl, msgRejeitar];

    for (const texto of mensagens) {
      try {
        const resp = await axios.post(
          c.evolution_api_url + '/message/sendText/' + c.evolution_instance,
          { number: phone, text: texto, linkPreview: false },
          { headers: { 'Content-Type': 'application/json', apikey: c.evolution_api_key }, timeout: 15000 }
        );
        console.log('  msg enviada | Status:', resp.status, '|', texto.slice(0, 60));
      } catch (e) {
        console.error('  Erro:', e.response?.data || e.message);
      }
      await new Promise(res => setTimeout(res, 800));
    }
    console.log('Enviado:', action.campaignName);

    // Pequena pausa entre mensagens
    await new Promise(res => setTimeout(res, 1000));
  }
}

main().catch(console.error);
