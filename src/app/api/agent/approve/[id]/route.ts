import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { executeAction } from '@/lib/marketing/services/agentDecisor';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

async function getAction(id: string) {
  const { rows } = await pool.query(`
    SELECT
      a.id,
      a.tenant_id AS "tenantId",
      a."campaignId",
      a."campaignName",
      a.type,
      a.title,
      a.description,
      a.confidence,
      a.status,
      a.approval_pin     AS "approvalPin",
      a.approval_pin_exp AS "approvalPinExp",
      a.budget_proposed,
      COALESCE(
        a.scale_pct,
        (SELECT sb.value::int FROM public.system_benchmarks sb
          WHERE sb.metric_key = 'scale_budget_base_pct'
            AND sb.segment_id = COALESCE(cl.segment_id, t.segment_id) LIMIT 1),
        20
      ) AS scale_pct,
      COALESCE(SUM(ads."dailyBudget"), 0)::int AS current_budget
    FROM campanhasmarketingdigital."AgentAction" a
    LEFT JOIN public.tenants t ON t.id = a.tenant_id
    LEFT JOIN campanhasmarketingdigital."Campaign" cam ON cam.id = a."campaignId"
    LEFT JOIN public.clientes cl ON cl.uuid = cam.client_id
    LEFT JOIN campanhasmarketingdigital."AdSet" ads ON ads."campaignId" = a."campaignId"
    WHERE a.id = $1
    GROUP BY a.id, a.tenant_id, a."campaignId", a."campaignName", a.type, a.title,
             a.description, a.confidence, a.status, a.approval_pin, a.approval_pin_exp,
             a.budget_proposed, a.scale_pct, cl.segment_id, t.segment_id
    LIMIT 1
  `, [id]);
  return rows[0] ?? null;
}

async function setStatus(id: string, status: string) {
  await prisma.$executeRaw`
    UPDATE campanhasmarketingdigital."AgentAction" SET status = ${status} WHERE id = ${id}`;
}

const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

// GET /api/agent/approve/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const action = await getAction(params.id);

  if (!action) return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404);
  if (action.status === 'EXECUTED') return htmlResponse('✅ Já executada', `A ação "${action.title}" já foi executada anteriormente.`, 200);
  if (action.status === 'REJECTED') return htmlResponse('🚫 Já rejeitada', `A ação "${action.title}" já foi rejeitada.`, 200);
  if (action.status !== 'PENDING_APPROVAL') return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite aprovação.`, 400);
  if (action.approvalPinExp && new Date() > new Date(action.approvalPinExp)) {
    return htmlResponse('⏰ Expirada', 'Esta aprovação expirou. O agente criará uma nova sugestão no próximo ciclo.', 400);
  }

  return htmlPinForm(params.id, action);
}

// POST /api/agent/approve/[id]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let pin = '';
  let customBudgetCents: number | undefined;

  try {
    const ct = request.headers.get('content-type') ?? '';
    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const form = new URLSearchParams(text);
      pin = form.get('pin') ?? '';
      const budgetVal = form.get('customBudget');
      if (budgetVal) {
        const reais = parseFloat(budgetVal.replace(',', '.'));
        if (!isNaN(reais) && reais > 0) customBudgetCents = Math.round(reais * 100);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      pin = body.pin ?? '';
      if (body.customBudget) customBudgetCents = body.customBudget;
    }
  } catch {
    return htmlResponse('❌ Erro', 'Não foi possível ler o formulário.', 400);
  }

  const action = await getAction(params.id);
  if (!action) return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404);
  if (action.status === 'EXECUTED') return htmlResponse('✅ Já executada', `A ação "${action.title}" já foi executada anteriormente.`, 200);
  if (action.status !== 'PENDING_APPROVAL') return htmlResponse('⚠️ Status inválido', `Status "${action.status}" não permite aprovação agora.`, 400);

  if (action.approvalPinExp && new Date() > new Date(action.approvalPinExp)) {
    await setStatus(params.id, 'EXPIRED');
    return htmlResponse('⏰ PIN expirado', 'O PIN de aprovação expirou (válido por 24h). O agente criará uma nova sugestão.', 400);
  }

  if (!action.approvalPin || action.approvalPin.trim() !== pin.trim()) {
    return htmlPinForm(params.id, action, '❌ PIN incorreto. Verifique o WhatsApp e tente novamente.');
  }

  await setStatus(params.id, 'PENDING_EXECUTION');

  try {
    await executeAction(action, action.tenantId ?? null, false, false, customBudgetCents);
    const budgetLine = customBudgetCents
      ? ` Novo investimento diário: <strong>${fmtBRL(customBudgetCents)}</strong>.`
      : '';
    return htmlResponse(
      '✅ Aprovado e executado!',
      `A ação <strong>${action.title}</strong> para <strong>${action.campaignName}</strong> foi executada.${budgetLine}`,
      200,
    );
  } catch (err: any) {
    await setStatus(params.id, 'PENDING_APPROVAL');
    return htmlResponse('❌ Erro na execução', `Houve um erro ao executar: ${err?.message ?? String(err)}`, 500);
  }
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function htmlPinForm(id: string, action: any, errorMsg?: string) {
  const isScale = action.type === 'SCALE';
  const proposed = action.budget_proposed ?? 0;
  const current  = action.current_budget ?? 0;
  const scalePct = action.scale_pct ?? 20;

  const proposedReais = proposed > 0 ? (proposed / 100).toFixed(2) : '';
  const currentFmt    = current > 0 ? fmtBRL(current) : null;
  const proposedFmt   = proposed > 0 ? fmtBRL(proposed) : null;

  const budgetSection = isScale ? `
    <div class="section">
      <div class="section-label">💰 Investimento Diário</div>
      ${currentFmt && proposedFmt ? `
      <div class="budget-row">
        <div class="budget-box">
          <div class="budget-sublabel">Atual</div>
          <div class="budget-val">${currentFmt}</div>
        </div>
        <div class="budget-arrow">→</div>
        <div class="budget-box highlight">
          <div class="budget-sublabel">Proposto (+${scalePct}%)</div>
          <div class="budget-val green">${proposedFmt}</div>
        </div>
      </div>` : ''}
      <div class="field-label" style="margin-top:16px">Valor a aplicar (R$)</div>
      <div class="budget-input-wrap">
        <span class="currency-prefix">R$</span>
        <input
          type="text"
          id="customBudget"
          name="customBudget"
          inputmode="decimal"
          value="${proposedReais}"
          placeholder="0,00"
          class="budget-input"
        />
      </div>
      <div id="budget-hint" class="budget-hint"></div>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>✅ Aprovação — Agente Tráfego Pago</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#ECE5DD;min-height:100vh;padding-bottom:40px}
    .header{background:#075E54;padding:20px 16px 16px;color:white}
    .header-sub{font-size:11px;opacity:.75;margin-bottom:4px;letter-spacing:.5px}
    .header-title{font-size:17px;font-weight:600}
    .card{background:white;border-radius:12px;padding:16px;margin:12px 12px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .section{background:white;border-radius:12px;padding:16px;margin:10px 12px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .section-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;font-weight:600}
    .campaign-name{font-size:16px;font-weight:700;color:#111;margin-bottom:8px}
    .action-title{font-size:14px;color:#333;margin-bottom:4px;font-weight:500}
    .action-desc{font-size:13px;color:#666;line-height:1.5}
    .badge{display:inline-flex;align-items:center;gap:4px;background:#e8f5e9;border-radius:20px;padding:4px 10px;font-size:12px;color:#2e7d32;font-weight:500;margin-top:10px}
    .budget-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    .budget-box{flex:1;background:#f8fafc;border-radius:8px;padding:10px 12px}
    .budget-box.highlight{background:#f0fdf4}
    .budget-sublabel{font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
    .budget-val{font-size:18px;font-weight:700;color:#222}
    .budget-val.green{color:#075E54}
    .budget-arrow{font-size:18px;color:#aaa;flex-shrink:0}
    .field-label{font-size:13px;color:#444;font-weight:500;margin-bottom:8px}
    .budget-input-wrap{position:relative}
    .currency-prefix{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#333;font-weight:600}
    .budget-input{width:100%;padding:13px 14px 13px 44px;font-size:20px;font-weight:700;border:2px solid #075E54;border-radius:8px;outline:none;color:#111;background:white}
    .budget-hint{font-size:12px;color:#777;margin-top:6px;min-height:18px}
    .pin-section{background:white;border-radius:12px;padding:16px;margin:10px 12px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .pin-label{font-size:13px;color:#444;font-weight:500;margin-bottom:8px}
    .pin-input{width:100%;padding:12px;font-size:26px;font-weight:700;letter-spacing:10px;text-align:center;border:2px solid #ddd;border-radius:8px;outline:none;color:#111;background:#f8fafc;transition:border-color .2s}
    .pin-input:focus{border-color:#075E54;background:white}
    .pin-hint{font-size:11px;color:#aaa;text-align:center;margin-top:6px}
    .error{background:#fff3f3;border:1px solid #ffcdd2;border-radius:8px;padding:10px 14px;font-size:13px;color:#c62828;margin:10px 12px 0}
    .btn-approve{width:calc(100% - 24px);margin:14px 12px 0;display:block;padding:15px;background:#075E54;color:white;font-size:16px;font-weight:600;border:none;border-radius:12px;cursor:pointer;transition:opacity .2s;text-align:center}
    .btn-approve:disabled{background:#ccc;cursor:not-allowed}
    .btn-approve:not(:disabled):active{opacity:.85}
    .btn-reject{width:calc(100% - 24px);margin:10px 12px 0;display:block;padding:13px;background:white;color:#c62828;font-size:15px;font-weight:500;border:2px solid #ef9a9a;border-radius:12px;cursor:pointer}
    .btn-reject:disabled{opacity:.5;cursor:not-allowed}
    .expiry{text-align:center;font-size:11px;color:#aaa;margin-top:16px;padding:0 12px}
  </style>
</head>
<body>
  <div class="header">
    <div class="header-sub">Agente Tráfego Pago</div>
    <div class="header-title">${isScale ? '📈 Escalar Investimento' : '⚡ Aprovação de Ação'}</div>
  </div>

  <div class="card">
    <div class="section-label">Campanha</div>
    <div class="campaign-name">${action.campaignName}</div>
    <div class="action-title">${action.title}</div>
    <div class="action-desc">${action.description}</div>
    <div class="badge">🎯 ${(action.confidence * 100).toFixed(0)}% de confiança</div>
  </div>

  ${budgetSection}

  ${errorMsg ? `<div class="error">⚠️ ${errorMsg}</div>` : ''}

  <form id="form" method="POST" action="/api/agent/approve/${id}">
    <div class="pin-section">
      <div class="pin-label">🔐 PIN de confirmação</div>
      <input
        type="text"
        id="pin"
        name="pin"
        inputmode="numeric"
        pattern="[0-9]{6}"
        maxlength="6"
        placeholder="• • • • • •"
        autocomplete="one-time-code"
        ${!errorMsg ? 'autofocus' : ''}
        class="pin-input"
        required
      />
      <div class="pin-hint">PIN de 6 dígitos enviado no WhatsApp · válido por 24h</div>
    </div>

    <button type="submit" id="btn-approve" name="action" value="approve" class="btn-approve" disabled>
      ✅ Aprovar${isScale ? ' — calculando...' : ''}
    </button>
  </form>

  <form method="POST" action="/api/agent/reject/${id}">
    <input type="hidden" name="pin" id="pin-reject" value="" />
    <button type="submit" id="btn-reject" class="btn-reject" disabled>
      ❌ Rejeitar
    </button>
  </form>

  <div class="expiry">Expira em: ${new Date(action.approvalPinExp).toLocaleString('pt-BR')}</div>

  <script>
    const pinEl    = document.getElementById('pin');
    const pinRej   = document.getElementById('pin-reject');
    const btnApp   = document.getElementById('btn-approve');
    const btnRej   = document.getElementById('btn-reject');
    const budgetEl = document.getElementById('customBudget');
    const hintEl   = document.getElementById('budget-hint');

    const currentCents  = ${current};
    const proposedCents = ${proposed};
    const isScale = ${isScale ? 'true' : 'false'};

    function fmtBRL(cents) {
      return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
    }

    function updateBtn() {
      const pinOk = pinEl.value.replace(/\\D/g, '').length === 6;
      btnApp.disabled = !pinOk;
      btnRej.disabled = !pinOk;
      pinRej.value = pinEl.value;

      if (isScale && budgetEl) {
        const raw = parseFloat(budgetEl.value.replace(',', '.'));
        if (!isNaN(raw) && raw > 0) {
          const cents = Math.round(raw * 100);
          btnApp.textContent = '✅ Aprovar — ' + fmtBRL(cents) + '/dia';
          if (currentCents > 0 && cents !== proposedCents) {
            const pct = ((cents - currentCents) / currentCents * 100).toFixed(0);
            hintEl.textContent = 'Valor editado: ' + fmtBRL(cents) + '/dia (' + (cents > currentCents ? '+' : '') + pct + '% vs atual)';
          } else {
            hintEl.textContent = '';
          }
        } else {
          btnApp.textContent = '✅ Aprovar';
          hintEl.textContent = '';
        }
      } else if (pinOk) {
        btnApp.textContent = '✅ Aprovar e Executar';
      }
    }

    pinEl.addEventListener('input', () => {
      pinEl.value = pinEl.value.replace(/\\D/g, '').slice(0, 6);
      updateBtn();
    });

    if (budgetEl) {
      budgetEl.addEventListener('input', updateBtn);
      budgetEl.addEventListener('focus', function() { this.select(); });
    }

    // Inicializa
    updateBtn();

    // Feedback no submit
    document.getElementById('form').addEventListener('submit', function() {
      btnApp.textContent = '⏳ Processando...';
      btnApp.disabled = true;
    });
  </script>
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
  <title>${title} — Agente Tráfego Pago</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#ECE5DD;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .card{background:white;border-radius:16px;padding:2.5rem 1.5rem;max-width:400px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.10)}
    .icon{font-size:3rem;margin-bottom:1rem}
    h1{font-size:1.25rem;font-weight:700;color:#1e293b;margin-bottom:.5rem}
    p{color:#64748b;line-height:1.5;font-size:.9rem}
    .bar{height:4px;border-radius:2px;margin-bottom:1.5rem;background:${isOk ? '#075E54' : '#dc2626'}}
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
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
