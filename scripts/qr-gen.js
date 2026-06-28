const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ host: 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres' });

async function main() {
  const r = await pool.query(
    "SELECT evolution_api_url, evolution_api_key, evolution_instance FROM public.tenants WHERE id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'"
  );
  pool.end();
  const c = r.rows[0];

  console.log(`Instância: ${c.evolution_instance} | URL: ${c.evolution_api_url}`);

  let resp;
  try {
    resp = await axios.get(`${c.evolution_api_url}/instance/connect/${c.evolution_instance}`, {
      headers: { apikey: c.evolution_api_key },
      timeout: 15000,
    });
  } catch (e) {
    console.error('Erro connect:', e.response?.status, JSON.stringify(e.response?.data ?? e.message));
    process.exit(1);
  }

  const d = resp.data;
  console.log('Resposta connect (sem base64):', JSON.stringify(
    Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'base64' && k !== 'qr'))
  ));

  const qr = d.base64 || d.qrcode?.base64 || d.qr || d.code;
  if (!qr) {
    console.error('QR code não encontrado na resposta. Chaves:', Object.keys(d));
    process.exit(1);
  }

  const src = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WPP QR</title>
<meta http-equiv="refresh" content="30">
<style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f0f0f0}
img{border:8px solid white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.2)}
h2{color:#128C7E}</style></head><body>
<h2>Escaneie com WhatsApp</h2>
<p>Instância: <strong>${c.evolution_instance}</strong> — página atualiza a cada 30s</p>
<img src="${src}" width="300" height="300"/>
<p style="margin-top:20px;color:#999;font-size:12px">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
</body></html>`;

  const out = path.join(__dirname, 'qr.html');
  fs.writeFileSync(out, html);
  console.log(`\nQR salvo: ${out}`);
  console.log('Abra scripts/qr.html no browser para escanear.');
}
main().catch(console.error);
