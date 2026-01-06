import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = request.cookies.get('accessToken')?.value
  return cookie || null
}

function getLoggedUserId(request: NextRequest): string | null {
  const token = getToken(request)
  if (!token) return null
  try {
    const decoded: any = verifyTokenNode(token)
    return decoded?.userId || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, ctx: { params: { prospectId: string } }) {
  try {
    const userId = getLoggedUserId(request)
    if (!userId) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const prospectId = Number(ctx?.params?.prospectId || '')
    if (!Number.isFinite(prospectId) || prospectId <= 0) {
      return NextResponse.json({ success: false, error: 'Prospect inválido' }, { status: 400 })
    }

    const pool = (await import('@/lib/database/connection')).default
    const q = `
      SELECT
        a.prospect_id,
        a.status,
        a.created_at as atribuido_em,
        a.expira_em,
        a.aceito_em,
        COALESCE(a.motivo->>'type','') as motivo_type,
        (a.expira_em IS NOT NULL AND a.status = 'atribuido') as requires_aceite,
        ip.created_at as data_interesse,
        i.id as imovel_id,
        i.codigo,
        i.titulo,
        i.descricao,
        i.preco,
        i.preco_condominio,
        i.preco_iptu,
        i.taxa_extra,
        i.area_total,
        i.area_construida,
        i.quartos,
        i.banheiros,
        i.suites,
        i.vagas_garagem,
        i.varanda,
        i.andar,
        i.total_andares,
        i.aceita_permuta,
        i.aceita_financiamento,
        i.endereco,
        i.numero,
        i.complemento,
        i.bairro,
        i.cidade_fk,
        i.estado_fk,
        i.cep,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        si.nome as status_nome,
        pr.nome as proprietario_nome,
        pr.cpf as proprietario_cpf,
        pr.telefone as proprietario_telefone,
        pr.email as proprietario_email,
        pr.endereco as proprietario_endereco,
        pr.numero as proprietario_numero,
        pr.complemento as proprietario_complemento,
        pr.bairro as proprietario_bairro,
        pr.cidade_fk as proprietario_cidade,
        pr.estado_fk as proprietario_estado,
        pr.cep as proprietario_cep,
        c.nome as cliente_nome,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        ip.preferencia_contato,
        ip.mensagem
      FROM public.imovel_prospect_atribuicoes a
      INNER JOIN public.imovel_prospects ip ON ip.id = a.prospect_id
      INNER JOIN public.imoveis i ON ip.id_imovel = i.id
      LEFT JOIN public.tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN public.status_imovel si ON i.status_fk = si.id
      LEFT JOIN public.proprietarios pr ON pr.uuid = i.proprietario_uuid
      INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
      WHERE a.corretor_fk = $1::uuid
        AND a.prospect_id = $2::int
        AND a.status IN ('atribuido','aceito','expirado')
      ORDER BY a.created_at DESC
      LIMIT 1
    `
    const res = await pool.query(q, [userId, prospectId])
    const lead = res.rows?.[0] || null
    if (!lead) return NextResponse.json({ success: false, error: 'Lead não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, lead })
  } catch (e) {
    console.error('Erro ao buscar prospect do corretor:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


