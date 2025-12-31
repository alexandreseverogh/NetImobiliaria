import pool from '@/lib/database/connection'
import emailService from '@/services/emailService'

type RoutedBroker = {
  id: string
  nome: string
  email: string
  motivo: any
}

async function getSlaMinutosAceiteLead(): Promise<number> {
  try {
    const r = await pool.query('SELECT sla_minutos_aceite_lead FROM public.parametros LIMIT 1')
    const v = r.rows?.[0]?.sla_minutos_aceite_lead
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return 5
    return n
  } catch {
    return 5
  }
}

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return 'http://localhost:3000'
}

async function pickBrokerByArea(estado: string, cidade: string): Promise<RoutedBroker | null> {
  // Regra de escolha:
  // 1) menor carga de leads recebidos (COUNT atribuições)
  // 2) em empate, maior tempo sem receber leads (MAX created_at mais antigo; NULL primeiro)
  // Observação: exclui plantonista do match normal (plantonista é fallback).
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COUNT(a.id) AS total_recebidos,
      MAX(a.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
    GROUP BY u.id, u.nome, u.email
    ORDER BY COUNT(a.id) ASC, MAX(a.created_at) ASC NULLS FIRST, u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q, [estado, cidade])
  if (r.rows.length === 0) return null
  const row = r.rows[0]
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'area_match', estado_fk: estado, cidade_fk: cidade }
  }
}

async function pickBrokerById(corretorFk: string): Promise<RoutedBroker | null> {
  const q = `
    SELECT u.id, u.nome, u.email
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE u.id = $1::uuid
      AND u.ativo = true
      AND ur.name = 'Corretor'
    LIMIT 1
  `
  const r = await pool.query(q, [corretorFk])
  if (r.rows.length === 0) return null
  const row = r.rows[0]
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'imovel_corretor_fk', corretor_fk: row.id }
  }
}

async function pickPlantonistaBroker(): Promise<RoutedBroker | null> {
  // Plantonista também segue menor carga e maior tempo sem receber, para evitar concentrar em 1 só.
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COUNT(a.id) AS total_recebidos,
      MAX(a.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = true
    GROUP BY u.id, u.nome, u.email
    ORDER BY COUNT(a.id) ASC, MAX(a.created_at) ASC NULLS FIRST, u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q)
  if (r.rows.length === 0) return null
  const row = r.rows[0]
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'fallback_plantonista' }
  }
}

export async function routeProspectAndNotify(prospectId: number): Promise<{ success: boolean; reason?: string }> {
  // Buscar dados do prospect com imóvel e cliente (para roteamento e email)
  const dataQuery = await pool.query(
    `
    SELECT
      ip.id as prospect_id,
      ip.created_at as data_interesse,
      ip.preferencia_contato,
      ip.mensagem,
      i.id as imovel_id,
      i.corretor_fk,
      i.codigo,
      i.titulo,
      i.preco,
      i.cidade_fk,
      i.estado_fk,
      c.nome as cliente_nome,
      c.email as cliente_email,
      c.telefone as cliente_telefone
    FROM imovel_prospects ip
    INNER JOIN imoveis i ON ip.id_imovel = i.id
    INNER JOIN clientes c ON ip.id_cliente = c.uuid
    WHERE ip.id = $1
    `,
    [prospectId]
  )

  if (dataQuery.rows.length === 0) return { success: false, reason: 'Prospect não encontrado' }
  const p = dataQuery.rows[0]

  const estado = String(p.estado_fk || '').trim()
  const cidade = String(p.cidade_fk || '').trim()
  if (!estado || !cidade) return { success: false, reason: 'Imóvel sem estado/cidade' }

  // REGRA: se o imóvel tiver corretor_fk definido, o lead vai direto para ele.
  let broker: RoutedBroker | null = null
  const imovelCorretorFk = p.corretor_fk ? String(p.corretor_fk).trim() : ''
  if (imovelCorretorFk) {
    broker = await pickBrokerById(imovelCorretorFk)
  }

  // Caso não haja corretor_fk válido no imóvel, usar menor carga / maior tempo sem receber
  if (!broker) broker = await pickBrokerByArea(estado, cidade)
  if (!broker) broker = await pickPlantonistaBroker()
  if (!broker) return { success: false, reason: 'Nenhum corretor elegível (sem área e sem plantonista)' }

  // Criar atribuição com SLA (minutos configurável em parametros.sla_minutos_aceite_lead)
  const slaMinutos = await getSlaMinutosAceiteLead()
  const expiraEm = new Date(Date.now() + slaMinutos * 60 * 1000)
  try {
    // Evitar criar atribuição duplicada caso esse método seja chamado mais de uma vez
    const activeCheck = await pool.query(
      `
      SELECT id
      FROM public.imovel_prospect_atribuicoes
      WHERE prospect_id = $1
        AND status IN ('atribuido', 'aceito')
      LIMIT 1
      `,
      [prospectId]
    )
    if (activeCheck.rows.length > 0) {
      return { success: true }
    }

    await pool.query(
      `
      INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
      VALUES ($1, $2::uuid, 'atribuido', $3::jsonb, $4)
      `,
      [prospectId, broker.id, JSON.stringify(broker.motivo || {}), expiraEm]
    )
  } catch (e) {
    return { success: false, reason: 'Falha ao criar atribuição' }
  }

  // Enviar email ao corretor (aceite necessário)
  try {
    const formatCurrency = (value: number | null | undefined): string => {
      if (value === null || value === undefined) return '-'
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    // Link direto para o lead específico (o corretor ainda precisa estar logado)
    const painelUrl = `${getAppBaseUrl()}/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}`
    await emailService.sendTemplateEmail('novo-lead-corretor', broker.email, {
      corretor_nome: broker.nome || 'Corretor',
      codigo: String(p.codigo || '-'),
      titulo: String(p.titulo || 'Imóvel'),
      cidade: String(p.cidade_fk || '-'),
      estado: String(p.estado_fk || '-'),
      preco: formatCurrency(p.preco),
      cliente_nome: String(p.cliente_nome || '-'),
      cliente_telefone: String(p.cliente_telefone || '-'),
      cliente_email: String(p.cliente_email || '-'),
      preferencia_contato: String(p.preferencia_contato || 'Não informado'),
      mensagem: String(p.mensagem || 'Sem mensagem'),
      painel_url: painelUrl
    })
  } catch {
    // Não falhar o roteamento se o e-mail falhar
  }

  return { success: true }
}


