const fs = require('fs');
const http = require('http');
const key = fs.readFileSync(__dirname + '/.evokey', 'utf8').trim();

function send(text) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ number: '5581998000047', text, linkPreview: false });
    const req = http.request('http://localhost:8081/message/sendText/trafegopago-wpp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => {
        try { const j = JSON.parse(body); resolve(`type=${j.messageType} status=${j.status} id=${j.key?.id}`); }
        catch { resolve('RAW:' + body.slice(0,200)); }
      });
    });
    req.on('error', e => resolve('ERR ' + e.message));
    req.write(data); req.end();
  });
}

(async () => {
  console.log('A (curta):', await send('TESTE A - mensagem curta de validacao'));
  await new Promise(r => setTimeout(r, 1500));
  console.log('B (media):', await send('TESTE B\nLinha 2\nLinha 3 com acentuacao: orcamento R$ 100 -> R$ 140'));
})();
