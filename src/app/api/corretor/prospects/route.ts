import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { AUTH_CONFIG } from '@/lib/config/auth'
import { getPublicTokenFromRequest } from '@/lib/auth/jwt-public'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLoggedUserId(request: NextRequest): { userId: string | null, error?: string } {
  const token = getPublicTokenFromRequest(request)  // ✅ Use public helper
  if (!token) {
    return { userId: null, error: 'Token not found in headers/cookies' }
  }
  try {
    const decoded: any = verifyTokenNode(token)
    if (!decoded) {
      return { userId: null, error: 'verifyTokenNode returned null (invalid signature/expired)' }
    }
    return { userId: decoded.userId }
  } catch (e: any) {
    return { userId: null, error: `Exception: ${e.message}` }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = getLoggedUserId(request)

    if (!userId) {
      const token = getPublicTokenFromRequest(request)  // ✅ Use public helper
      console.error('❌ CORRETOR PROSPECTS - Token inválido ou ausente:', {
        error,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A'
      })
      return NextResponse.json(
        { success: false, message: 'Não autorizado', details: error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusRaw = String(searchParams.get('status') || 'atribuido').trim().toLowerCase()
    const status = statusRaw === 'all' ? 'all' : statusRaw

    const pool = (await import('@/lib/database/connection')).default
    const q =
      status === 'all'
        ? `
      SELECT
        a.prospect_id,
        a.status,
        a.created_at as atribuido_em,
        a.expira_em,
        a.data_aceite as aceito_em,
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
        ip.mensagem,
        i.status_fk as imovel_status_fk
      FROM public.imovel_prospect_atribuicoes a
      INNER JOIN public.imovel_prospects ip ON ip.id = a.prospect_id
      INNER JOIN public.imoveis i ON ip.id_imovel = i.id
      LEFT JOIN public.tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN public.status_imovel si ON i.status_fk = si.id
      LEFT JOIN public.proprietarios pr ON pr.uuid = i.proprietario_uuid
      INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
      WHERE a.corretor_fk = $1::uuid
        AND a.status IN ('atribuido','aceito','expirado')
      ORDER BY a.created_at DESC
      LIMIT 200
    `
        : `
      SELECT
        a.prospect_id,
        a.status,
        a.created_at as atribuido_em,
        a.expira_em,
        a.data_aceite as aceito_em,
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
        ip.mensagem,
        i.status_fk as imovel_status_fk
      FROM public.imovel_prospect_atribuicoes a
      INNER JOIN public.imovel_prospects ip ON ip.id = a.prospect_id
      INNER JOIN public.imoveis i ON ip.id_imovel = i.id
      LEFT JOIN public.tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN public.status_imovel si ON i.status_fk = si.id
      LEFT JOIN public.proprietarios pr ON pr.uuid = i.proprietario_uuid
      INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
      WHERE a.corretor_fk = $1::uuid
        AND ($2::text IS NULL OR a.status = $2)
      ORDER BY a.created_at DESC
      LIMIT 200
    `
    const res =
      status === 'all'
        ? await pool.query(q, [userId])
        : await pool.query(q, [userId, status || null])

    return NextResponse.json({ success: true, leads: res.rows })
  } catch (e) {
    console.error('Erro ao listar prospects do corretor:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


