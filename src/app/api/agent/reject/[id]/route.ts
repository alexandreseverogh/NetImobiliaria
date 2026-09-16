import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';

export const dynamic = 'force-dynamic';

// Lê a ação via SQL raw — o Prisma client gerado pode estar desatualizado e
// não retornar approval_pin/approval_pin_exp, quebrando a validação do PIN.
async function getAction(id: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, tenant_id AS "tenantId", "campaignId", "campaignName", type, title,
           description, confidence, status,
           approval_pin AS "approvalPin", approval_pin_exp AS "approvalPinExp"
    FROM campanhasmarketingdigital."AgentAction" WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

async function setStatus(id: string, status: string) {
  await prisma.$executeRaw`
    UPDATE campanhasmarketingdigital."AgentAction" SET status = ${status} WHERE id = ${id}`;
}

// GET /api/agent/reject/[id]
// Enviado via link no WhatsApp — abre formulário de PIN no browser
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const action = await getAction(params.id);

  if (!action) {
    return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404);
  }
  if (action.status === 'REJECTED') {
    return htmlResponse('🚫 Já rejeitada', `A ação "${action.title}" já foi rejeitada anteriormente.`, 200);
  }
  if (action.status === 'EXECUTED') {
    return htmlResponse('⚠️ Já executada', `A ação "${action.title}" foi executada antes desta rejeição.`, 200);
  }
  if (action.status === 'EXPIRED') {
    return htmlResponse('⏰ Expirada', 'Esta aprovação expirou. O agente criará uma nova sugestão no próximo ciclo.', 200);
  }
  if (action.status !== 'PENDING_APPROVAL') {
    return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite rejeição agora.`, 400);
  }

  return htmlPinForm(params.id, action.campaignName, action.title, action.description);
}

// POST /api/agent/reject/[id]
// Recebe o PIN do formulário e rejeita a ação se válido
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let pin = '';
  try {
    const ct = request.headers.get('content-type') ?? '';
    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      pin = new URLSearchParams(text).get('pin') ?? '';
    } else {
      const body = await request.json().catch(() => ({}));
      pin = body.pin ?? '';
    }
  } catch {
    return htmlResponse('❌ Erro', 'Não foi possível ler o formulário.', 400);
  }

  const action = await getAction(params.id);

  if (!action) {
    return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404);
  }
  if (action.status === 'REJECTED') {
    return htmlResponse('🚫 Já rejeitada', `A ação "${action.title}" já foi rejeitada anteriormente.`, 200);
  }
  if (action.status !== 'PENDING_APPROVAL') {
    return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite rejeição agora.`, 400);
  }

  // Verificar expiração
  if (action.approvalPinExp && new Date() > new Date(action.approvalPinExp)) {
    await setStatus(params.id, 'EXPIRED');
    return htmlResponse('⏰ PIN expirado', 'O PIN de confirmação expirou (válido por 24h).', 400);
  }

  // Verificar PIN
  if (!action.approvalPin || action.approvalPin.trim() !== pin.trim()) {
    return htmlPinForm(
      params.id,
      action.campaignName,
      action.title,
      action.description,
      '❌ PIN incorreto. Verifique o WhatsApp e tente novamente.',
    );
  }

  // PIN correto — rejeitar
  await setStatus(params.id, 'REJECTED');

  // docs/PLANO_TIKTOK.md T4 — sincroniza o status da BudgetReallocation vinculada, senão fica
  // presa em 'PROPOSED' pra sempre (o cron de medição D+14 e o histórico leriam errado).
  if (action.type === 'REALLOCATE_BUDGET') {
    await prisma.$executeRaw`
      UPDATE campanhasmarketingdigital."BudgetReallocation"
      SET status = 'REJECTED' WHERE agent_action_id = ${params.id}`;
  }

  return htmlResponse(
    '🚫 Ação rejeitada',
    `A ação <strong>${action.title}</strong> para a campanha <strong>${action.campaignName}</strong> foi rejeitada. O agente não executará esta mudança.`,
    200,
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function htmlPinForm(
  id: string,
  campaignName: string,
  title: string,
  description: string,
  errorMsg?: string,
) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚫 Rejeitar Ação — Agente Trafego Pago</title>
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
    .campaign { font-size: .85rem; color: #64748b; text-align: center; margin-bottom: 1.25rem; }
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
    <h1>Rejeitar Ação</h1>
    <p class="campaign">${campaignName}</p>
    <div class="detail">
      <strong>Ação do Agente</strong>
      <p>${title}</p>
    </div>
    ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
    <form method="POST" action="/api/agent/reject/${id}">
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
      <button type="submit">🚫 Rejeitar Ação</button>
    </form>
    <p class="hint">PIN de 6 dígitos · válido por 24h · uso único</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: errorMsg ? 422 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function htmlResponse(title: string, body: string, status: number) {
  const isOk = status < 400;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Agente Trafego Pago</title>
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
</html>`;

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
