const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const key = fs.readFileSync(path.join(__dirname, '.evokey'), 'utf8').trim();

// Busca QR de dentro do container (port-forward do Docker Desktop está travado)
let raw;
try {
  raw = execSync(
    `docker exec netimobiliaria-evolution wget -qO- --timeout=15 ` +
    `"http://localhost:8080/instance/connect/trafegopago-wpp" ` +
    `--header "apikey: ${key}"`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 }
  );
} catch (e) {
  console.error('Erro ao buscar QR:', e.message);
  process.exit(1);
}

const d = JSON.parse(raw);
if (!d.base64) {
  console.error('Sem base64 na resposta:', JSON.stringify(d).slice(0, 200));
  process.exit(1);
}

const b64 = d.base64; // já é data:image/png;base64,...
const out = path.join(__dirname, 'qr-scan.html');

fs.writeFileSync(out, `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f2f5}
    .card{background:#fff;border-radius:16px;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,.15);text-align:center;max-width:420px;width:100%}
    h2{color:#128c7e;margin-bottom:.5rem}
    .sub{color:#555;font-size:.88rem;margin-bottom:1.5rem;line-height:1.5}
    img{width:300px;height:300px;border:1px solid #eee;border-radius:8px;display:block;margin:0 auto}
    #timer{font-size:1rem;font-weight:700;color:#e74c3c;margin-top:.75rem}
    #status{font-size:.85rem;color:#777;margin-top:.5rem}
  </style>
</head>
<body>
  <div class="card">
    <h2>&#128241; WhatsApp Gateway</h2>
    <p class="sub">No celular:<br><strong>Configura&ccedil;&otilde;es &rarr; Aparelhos conectados &rarr; Conectar um aparelho</strong></p>
    <img src="${b64}" alt="QR Code"/>
    <div id="timer">&#9203; expira em <span id="sec">40</span>s</div>
    <div id="status">Escaneie agora</div>
  </div>
  <script>
    var s=40,el=document.getElementById('sec');
    var t=setInterval(function(){s--;el.textContent=s;if(s<=0){clearInterval(t);document.getElementById('timer').textContent='QR expirado — feche e rode gen-qr-html.js novamente';}},1000);
  </script>
</body>
</html>`, 'utf8');

console.log('HTML salvo em:', out);
console.log('count:', d.count);
