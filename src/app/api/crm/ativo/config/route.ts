import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt'
import { resolveAtivoConfig } from '@/lib/crm/resolveAtivoConfig'

/**
 * Versão "leve" de leitura da config do ativo — pro Novo Lead (NovoLeadModal) saber se
 * "Vínculo Exato" está disponível e como rotular a aba, sem exigir a permissão de EDITAR o
 * Segment Builder (crm-segment-builder). Qualquer usuário autenticado do tenant (mesmo um
 * Atendente comum, sem acesso de config) pode ler isto — é só "existe ativo pra procurar?".
 */
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }
    const decoded = await verifyToken(token)
    if (!decoded?.tenantId) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const config = await resolveAtivoConfig(decoded.tenantId)
    if (!config) {
      // Nem tenant nem segmento têm config nenhuma ainda — nem Vínculo Exato, nem Perfil de
      // Interesse.
      return NextResponse.json({ success: true, available: false, formSchema: [] })
    }

    // "available" (Vínculo Exato) depende só de existir uma tabela real configurada —
    // form_schema (Perfil de Interesse) é independente e pode existir mesmo sem ela.
    return NextResponse.json({
      success: true,
      available: !!config.targetTable,
      label: config.targetLabel || 'Item',
      formSchema: config.formSchemaJson || [],
    })
  } catch (error: any) {
    console.error('❌ [crm/ativo/config] Erro:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
