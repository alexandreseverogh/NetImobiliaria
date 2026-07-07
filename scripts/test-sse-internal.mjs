// Roda DENTRO do container netimobiliaria-app (docker exec), acessando localhost:3000
// internamente — sem passar pelo port-forward do Docker Desktop no Windows.
const BASE = 'http://localhost:3000'

async function main() {
  console.log('--- 1. token (via arg ou login) ---')
  let token = process.argv[2]
  if (token) {
    console.log('usando token fornecido via argv, length:', token.length)
  } else {
    const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admmd', password: 'Admin@2024' }),
    })
    const loginData = await loginRes.json()
    token = loginData.token
    console.log('login ok?', loginRes.ok, 'token length:', token?.length)
  }

  console.log('--- 2. abrindo SSE ---')
  const controller = new AbortController()
  const ssePromise = (async () => {
    const res = await fetch(`${BASE}/api/admin/mensageria/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let received = ''
    // Loop de leitura correto: nunca chama read() de novo enquanto a chamada
    // anterior ainda está pendente — apenas encerra por timeout total via Promise.race no nível externo.
    const readLoop = (async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) received += decoder.decode(value, { stream: true })
      }
    })()
    await Promise.race([readLoop, new Promise((r) => setTimeout(r, 6000))])
    try { await reader.cancel() } catch { /* ok */ }
    return received
  })()

  await new Promise((r) => setTimeout(r, 1500))

  console.log('--- 3. disparando webhook Evolution simulado ---')
  const uniqueId = `SSE-INTERNAL-${Date.now()}` // único a cada run — evita idempotência mascarar o teste
  const webhookRes = await fetch(
    `${BASE}/api/public/evolution/webhook?token=003da176-4796-4142-a21a-536a1d48907d`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'MESSAGES_UPSERT',
        instance: 'trafegopago-wpp',
        data: {
          key: { remoteJid: '5511944443333@s.whatsapp.net', fromMe: false, id: uniqueId },
          pushName: 'Teste SSE Interno',
          message: { conversation: `Mensagem via teste interno do container (${uniqueId})` },
        },
      }),
    },
  )
  console.log('webhook status:', webhookRes.status)

  const sseData = await ssePromise
  controller.abort()

  console.log('--- 4. dados recebidos no SSE ---')
  console.log(sseData)

  const gotMessageEvent = sseData.includes('message.created')
  console.log('\n' + (gotMessageEvent ? '✅ EVENTO message.created RECEBIDO EM TEMPO REAL' : '❌ EVENTO NÃO CHEGOU'))
  process.exit(gotMessageEvent ? 0 : 1)
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
