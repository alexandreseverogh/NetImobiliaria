import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getReactivationAction, approveReactivation } from '@/lib/crm/agents/reactivationExecutor'

export const dynamic = 'force-dynamic'

/**
 * F4 — mirror exato do fluxo de aprovação já em produção nos agentes de Campanhas
 * (src/app/api/agent/approve/[id]/route.ts), escopado a public.crm_agent_actions. Enviado
 * via link no WhatsApp — sem sessão, autenticado só pelo PIN de 6 dígitos.
 */

// GET /api/crm/agent/approve/[id] — abre o formulário de PIN (com o rascunho editável)
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
    return htmlResponse('⚠️ Já decidida', `A ação "${action.title}" já foi aprovada e processada antes.`, 200)
  }
  if (action.status === 'EXPIRED') {
    return htmlResponse('⏰ Expirada', 'Esta aprovação expirou. O agente criará uma nova sugestão no próximo ciclo, se o lead continuar inativo.', 200)
  }
  if (action.status !== 'PENDING_APPROVAL') {
    return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite aprovação agora.`, 400)
  }

  return htmlPinForm(params.id, action.leadNome || 'Lead', action.title, action.suggestedMessage || '')
}

// POST /api/crm/agent/approve/[id] — recebe PIN + mensagem (editável) e aprova se válido
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let pin = ''
  let mensagem = ''
  try {
    const ct = request.headers.get('content-type') ?? ''
    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      const sp = new URLSearchParams(text)
      pin = sp.get('pin') ?? ''
      mensagem = sp.get('mensagem') ?? ''
    } else {
      const body = await request.json().catch(() => ({}))
      pin = body.pin ?? ''
      mensagem = body.mensagem ?? ''
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
    return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite aprovação agora.`, 400)
  }

  if (action.approvalPinExp && new Date() > new Date(action.approvalPinExp)) {
    await pool.query(`UPDATE public.crm_agent_actions SET status = 'EXPIRED' WHERE id = $1::uuid`, [params.id])
    return htmlResponse('⏰ PIN expirado', 'O PIN de confirmação expirou (válido por 24h).', 400)
  }

  if (!action.approvalPin || action.approvalPin.trim() !== pin.trim()) {
    return htmlPinForm(
      params.id,
      action.leadNome || 'Lead',
      action.title,
      mensagem || action.suggestedMessage || '',
      '❌ PIN incorreto. Verifique o WhatsApp e tente novamente.',
    )
  }

  try {
    const result = await approveReactivation(params.id, mensagem)
    if (result.outcome === 'sent') {
      return htmlResponse('✅ Reativação enviada', `A mensagem foi enviada para <strong>${action.leadNome || 'o lead'}</strong> via WhatsApp com sucesso.`, 200)
    }
    if (result.outcome === 'manual') {
      return htmlResponse(
        '📋 Aprovado — envio manual necessário',
        `Este segmento exige revisão extra (ou o lead não tem telefone cadastrado) — a mensagem NÃO foi enviada automaticamente. Copie e envie manualmente:<br><br><em>"${result.message}"</em>`,
        200,
      )
    }
    return htmlResponse(
      '⚠️ Aprovado — envio falhou',
      `A ação foi aprovada, mas o envio automático falhou (${result.error}). Copie e envie manualmente:<br><br><em>"${result.message}"</em>`,
      200,
    )
  } catch (err: any) {
    return htmlResponse('❌ Erro ao aprovar', err.message || 'Erro desconhecido.', 500)
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function htmlPinForm(
  id: string,
  leadNome: string,
  title: string,
  mensagem: string,
  errorMsg?: string,
) {
  const mensagemEscaped = mensagem
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>✅ Aprovar Reativação — Agente CRM</title>
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
      max-width: 440px;
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
      margin-bottom: 1.25rem;
    }
    .detail strong { display: block; font-size: .8rem; color: #475569; margin-bottom: .25rem; }
    .detail p { font-size: .9rem; color: #1e293b; line-height: 1.4; }
    label { display: block; font-size: .85rem; font-weight: 600; color: #475569; margin-bottom: .5rem; }
    textarea {
      width: 100%;
      padding: .75rem;
      font-size: .9rem;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      color: #1e293b;
      background: #f8fafc;
      resize: vertical;
      min-height: 90px;
      font-family: inherit;
      margin-bottom: 1.25rem;
    }
    textarea:focus { border-color: #16a34a; background: white; }
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
    input[type="text"]:focus { border-color: #16a34a; background: white; }
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
      background: #16a34a;
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
    <div class="icon">✅</div>
    <h1>Aprovar Reativação</h1>
    <p class="lead">${leadNome}</p>
    <div class="detail">
      <strong>Sugestão do Agente</strong>
      <p>${title}</p>
    </div>
    ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
    <form method="POST" action="/api/crm/agent/approve/${id}">
      <label for="mensagem">Mensagem (revise antes de enviar)</label>
      <textarea id="mensagem" name="mensagem">${mensagemEscaped}</textarea>
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
      <button type="submit">✅ Aprovar e Enviar</button>
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
      max-width: 420px;
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
