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
  console.log('Instância:', c.evolution_instance, '| URL:', c.evolution_api_url);

  // Primeiro checa estado atual
  const stateResp = await axios.get(
    `${c.evolution_api_url}/instance/connectionState/${c.evolution_instance}`,
    { headers: { apikey: c.evolution_api_key }, timeout: 8000 }
  );
  const state = stateResp.data?.instance?.state;
  console.log('Estado atual:', state);

  if (state === 'open') {
    console.log('Já conectado! Nao precisa de QR.');
    return;
  }

  // Solicita conexão / QR
  const resp = await axios.get(
    `${c.evolution_api_url}/instance/connect/${c.evolution_instance}`,
    { headers: { apikey: c.evolution_api_key }, timeout: 15000 }
  );
  const d = resp.data;
  console.log('Resposta connect (chaves):', Object.keys(d));

  // base64 = imagem PNG já pronta; code = texto bruto do QR
  const b64img = d.base64;
  const rawCode = d.code;

  if (!b64img && !rawCode) {
    console.error('Nenhum QR retornado:', JSON.stringify(d));
    process.exit(1);
  }

  let html;
  if (b64img) {
    const src = b64img.startsWith('data:') ? b64img : `data:image/png;base64,${b64img}`;
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WPP QR</title>
<meta http-equiv="refresh" content="30">
<style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f0f0f0}
img{border:8px solid white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.2)}
h2{color:#128C7E}</style></head><body>
<h2>Escaneie com WhatsApp</h2>
<p>Instância: <strong>${c.evolution_instance}</strong> — atualiza a cada 30s</p>
<img src="${src}" width="280" height="280"/>
<p style="margin-top:20px;color:#999;font-size:12px">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
</body></html>`;
  } else {
    // Usa qrcodejs via CDN para renderizar o texto bruto
    const escaped = JSON.stringify(rawCode);
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WPP QR</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f0f0f0}
#qr{display:inline-block;padding:12px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.2)}
h2{color:#128C7E}</style></head><body>
<h2>Escaneie com WhatsApp</h2>
<p>Instância: <strong>${c.evolution_instance}</strong></p>
<div id="qr"></div>
<p style="margin-top:20px;color:#999;font-size:12px">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
<script>new QRCode(document.getElementById("qr"),{text:${escaped},width:280,height:280,colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.L});</script>
</body></html>`;
  }

  const out = path.join(__dirname, 'qr.html');
  fs.writeFileSync(out, html);
  console.log('\nQR salvo em:', out);
  console.log('Abra scripts/qr.html no navegador e escaneie com o celular.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
