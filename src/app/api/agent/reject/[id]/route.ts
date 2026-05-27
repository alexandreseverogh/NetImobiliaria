import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';

export const dynamic = 'force-dynamic';

// GET /api/agent/reject/[id]
// Chamado via link no WhatsApp — sem JWT, autenticado pelo id único da ação
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const action = await prisma.agentAction.findUnique({ where: { id } });

    if (!action) {
      return htmlResponse('❌ Ação não encontrada', 'Esta ação não existe ou já foi removida.', 404);
    }

    if (action.status === 'REJECTED') {
      return htmlResponse('🚫 Já rejeitada', `A ação "${action.title}" já foi rejeitada anteriormente.`, 200);
    }

    if (action.status === 'EXECUTED') {
      return htmlResponse('⚠️ Já executada', `A ação "${action.title}" já foi executada antes desta rejeição.`, 200);
    }

    if (action.status !== 'PENDING_APPROVAL') {
      return htmlResponse(
        '⚠️ Status inválido',
        `Esta ação está com status "${action.status}" e não pode ser rejeitada agora.`,
        400
      );
    }

    await prisma.agentAction.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    return htmlResponse(
      '🚫 Ação rejeitada',
      `A ação <strong>${action.title}</strong> para a campanha <strong>${action.campaignName}</strong> foi rejeitada. O agente não executará esta mudança.`,
      200
    );
  } catch (error: any) {
    console.error('GET /api/agent/reject error:', error);
    return htmlResponse('❌ Erro interno', `Não foi possível rejeitar a ação: ${error.message}`, 500);
  }
}

function htmlResponse(title: string, body: string, status: number) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Agente Trafego Pago</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 2rem; max-width: 420px; width: 90%;
            text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { font-size: 1.5rem; margin-bottom: .75rem; }
    p { color: #6b7280; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
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
