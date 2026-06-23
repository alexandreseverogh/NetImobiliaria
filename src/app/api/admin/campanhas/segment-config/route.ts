/**
 * GET /api/admin/campanhas/segment-config
 * Devolve configurações do segmento efectivo do tenant autenticado.
 * Usado pela página de criativos para decidir se o botão "Gerar com IA" aparece.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const segment = await resolveSegment(payload.tenantId, null)

  return NextResponse.json({
    segment: segment
      ? {
          id:             segment.id,
          name:           segment.name,
          slug:           segment.slug,
          imagens_por_ia: segment.imagens_por_ia ?? false,
        }
      : null,
  })
}
