import { NextRequest, NextResponse } from 'next/server'
import { getReactivationAction, rejectReactivation } from '@/lib/crm/agents/reactivationExecutor'

export const dynamic = 'force-dynamic'

// GET /api/crm/agent/reject/[id] — abre formulário de PIN
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const action = await getReactivationAction(params.id)

  if (!action) {
    return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404)
  }
  if (action.status === 'REJECTED') {
    return htmlResponse('🚫 Já rejeitada', `A ação "${action.title}" já foi rejeitada anteriormente.`, 200)
  }
  if (action.status === 'EXECUTED' || action.status === 'APPROVED_MANUAL') {
    return htmlResponse('⚠️ Já decidida', `A ação "${action.title}" já foi aprovada e processada antes desta rejeição.`, 200)
  }
  if (action.status === 'EXPIRED') {
    return htmlResponse('⏰ Expirada', 'Esta aprovação expirou. O agente criará uma nova sugestão no próximo ciclo, se o lead continuar inativo.', 200)
  }
  if (action.status !== 'PENDING_APPROVAL') {
    return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite rejeição agora.`, 400)
  }

  return htmlPinForm(params.id, action.leadNome || 'Lead', action.title, action.description)
}

// POST /api/crm/agent/reject/[id] — recebe o PIN e rejeita se válido
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let pin = ''
  try {
    const ct = request.headers.get('content-type') ?? ''
    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      pin = new URLSearchParams(text).get('pin') ?? ''
    } else {
      const body = await request.json().catch(() => ({}))
      pin = body.pin ?? ''
    }
  } catch {
    return htmlResponse('❌ Erro', 'Não foi possível ler o formulário.', 400)
  }

  const action = await getReactivationAction(params.id)

  if (!action) {
    return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404)
  }
  if (action.status === 'REJECTED') {
    return htmlResponse('🚫 Já rejeitada', `A ação "${action.title}" já foi rejeitada anteriormente.`, 200)
  }
  if (action.status !== 'PENDING_APPROVAL') {
    return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite rejeição agora.`, 400)
  }

  if (!action.approvalPin || action.approvalPin.trim() !== pin.trim()) {
    return htmlPinForm(
      params.id,
      action.leadNome || 'Lead',
      action.title,
      action.description,
      '❌ PIN incorreto. Verifique o WhatsApp e tente novamente.',
    )
  }

  await rejectReactivation(params.id)

  return htmlResponse(
    '🚫 Reativação rejeitada',
    `A sugestão de reativação para <strong>${action.leadNome || 'o lead'}</strong> foi rejeitada. Nenhuma mensagem será enviada.`,
    200,
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function htmlPinForm(
  id: string,
  leadNome: string,
  title: string,
  description: string,
  errorMsg?: string,
) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚫 Rejeitar Reativação — Agente CRM</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2rem 1.5rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,.10);
    }
    .icon { font-size: 2.5rem; text-align: center; margin-bottom: .75rem; }
    h1 { font-size: 1.25rem; font-weight: 700; text-align: center; color: #1e293b; margin-bottom: .25rem; }
    .lead { font-size: .85rem; color: #64748b; text-align: center; margin-bottom: 1.25rem; }
    .detail {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: .875rem 1rem;
      margin-bottom: 1.5rem;
    }
    .detail strong { display: block; font-size: .8rem; color: #475569; margin-bottom: .25rem; }
    .detail p { font-size: .9rem; color: #1e293b; line-height: 1.4; }
    label { display: block; font-size: .85rem; font-weight: 600; color: #475569; margin-bottom: .5rem; }
    input[type="text"] {
      width: 100%;
      padding: .75rem 1rem;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: .3rem;
      text-align: center;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      color: #1e293b;
      background: #f8fafc;
      transition: border-color .2s;
    }
    input[type="text"]:focus { border-color: #f43f5e; background: white; }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: .625rem .875rem;
      font-size: .85rem;
      color: #dc2626;
      margin: .75rem 0;
    }
    button {
      width: 100%;
      margin-top: 1rem;
      padding: .875rem;
      background: #dc2626;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: opacity .2s;
    }
    button:hover { opacity: .9; }
    .hint { font-size: .78rem; color: #94a3b8; text-align: center; margin-top: .75rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚫</div>
    <h1>Rejeitar Reativação</h1>
    <p class="lead">${leadNome}</p>
    <div class="detail">
      <strong>Sugestão do Agente</strong>
      <p>${title}</p>
    </div>
    ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
    <form method="POST" action="/api/crm/agent/reject/${id}">
      <label for="pin">PIN enviado no WhatsApp</label>
      <input
        type="text"
        id="pin"
        name="pin"
        inputmode="numeric"
        pattern="[0-9]{6}"
        maxlength="6"
        placeholder="000000"
        autocomplete="one-time-code"
        autofocus
        required
      />
      <button type="submit">🚫 Rejeitar</button>
    </form>
    <p class="hint">PIN de 6 dígitos · válido por 24h · uso único</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: errorMsg ? 422 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function htmlResponse(title: string, body: string, status: number) {
  const isOk = status < 400
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Agente CRM</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2rem 1.5rem;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,.10);
    }
    h1 { font-size: 1.4rem; font-weight: 700; color: #1e293b; margin-bottom: .75rem; }
    p { color: #64748b; line-height: 1.5; font-size: .95rem; }
    .bar {
      height: 4px;
      border-radius: 2px;
      margin-bottom: 1.5rem;
      background: ${isOk ? '#16a34a' : '#dc2626'};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
