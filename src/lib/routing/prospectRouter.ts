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

function buildCorretorPainelUrl(prospectId: number): string {
  const base = getAppBaseUrl()
  const next = `/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}`
  return `${base}/corretor/entrar?next=${encodeURIComponent(next)}`
}

async function pickBrokerByArea(estado: string, cidade: string, excludeIds: string[] = []): Promise<RoutedBroker | null> {
  // Regra de escolha (Smart Routing):
  // 1) Maior Nível (Gamificação)
  // 2) Maior XP Total (Gamificação)
  // 3) Menor carga de leads recebidos
  // 4) Tempo sem receber (Round Robin implícito)
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp,
      COUNT(a.id) AS total_recebidos,
      MAX(a.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q, [estado, cidade, excludeIds || []])
  if (r.rows.length === 0) return null
  const row = r.rows[0]
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'area_match', estado_fk: estado, cidade_fk: cidade, debug: `Lvl:${row.nivel} XP:${row.xp}` }
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

async function pickPlantonistaBroker(excludeIds: string[] = []): Promise<RoutedBroker | null> {
  // Plantonista também segue mérito, mas dentro do pool de plantonistas
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp,
      COUNT(a.id) AS total_recebidos,
      MAX(a.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = true
      AND COALESCE(u.tipo_corretor, 'Interno') = 'Interno'
      AND (CASE WHEN array_length($1::uuid[], 1) > 0 THEN u.id != ALL($1::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q, [excludeIds || []])
  if (r.rows.length === 0) return null
  const row = r.rows[0]
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'fallback_plantonista', debug: `Lvl:${row.nivel} XP:${row.xp}` }
  }
}

export async function routeProspectAndNotify(
  prospectId: number,
  excludeIds: string[] = [],
  options?: { forceFallback?: boolean }
): Promise<{ success: boolean; reason?: string }> {
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
      i.mobiliado,
      i.aceita_permuta,
      i.aceita_financiamento,
      i.endereco,
      i.numero,
      i.complemento,
      i.bairro,
      i.cidade_fk,
      i.estado_fk,
      i.cep,
      i.latitude,
      i.longitude,
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
      c.telefone as cliente_telefone
    FROM imovel_prospects ip
    INNER JOIN imoveis i ON ip.id_imovel = i.id
    LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
    LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
    LEFT JOIN status_imovel si ON i.status_fk = si.id
    LEFT JOIN proprietarios pr ON pr.uuid = i.proprietario_uuid
    LEFT JOIN clientes c ON ip.id_cliente = c.uuid
    WHERE ip.id = $1
    `,
    [prospectId]
  )

  if (dataQuery.rows.length === 0) return { success: false, reason: 'Prospect não encontrado' }
  const p = dataQuery.rows[0]

  const estado = String(p.estado_fk || '').trim()
  const cidade = String(p.cidade_fk || '').trim()
  if (!estado || !cidade) return { success: false, reason: 'Imóvel sem estado/cidade' }

  // REGRA: se o imóvel tiver corretor_fk definido (captação), o lead vai direto para ele.
  let broker: RoutedBroker | null = null
  const imovelCorretorFk = p.corretor_fk ? String(p.corretor_fk).trim() : ''
  if (imovelCorretorFk) {
    broker = await pickBrokerById(imovelCorretorFk)
  }

  // Se não tem dono fixo...
  // 1. Tentar por Área (somente se NÃO for fallback forçado)
  if (!broker && !options?.forceFallback) {
    broker = await pickBrokerByArea(estado, cidade, excludeIds)
  }

  // 2. Se não achou (ou se foi forçado fallback), tentar Plantonista
  if (!broker) {
    broker = await pickPlantonistaBroker(excludeIds)
  }

  if (!broker) return { success: false, reason: 'Nenhum corretor elegível (sem área e sem plantonista)' }

  // Criar atribuição com SLA (minutos configurável em parametros.sla_minutos_aceite_lead)
  const slaMinutos = await getSlaMinutosAceiteLead()
  // REGRA CRÍTICA: se veio por imovel.corretor_fk, NÃO aplicar transbordo/SLA (expira_em = NULL)
  const motivoType = String((broker as any)?.motivo?.type || '')
  const isPlantonista = motivoType === 'fallback_plantonista'

  // Determinar status e expira_em baseado no tipo de atribuição
  let status: 'atribuido' | 'aceito' = 'atribuido'
  let expiraEm: Date | null = new Date(Date.now() + slaMinutos * 60 * 1000)

  if (motivoType === 'imovel_corretor_fk') {
    // Corretor fixo do imóvel: sem SLA
    expiraEm = null
  } else if (isPlantonista) {
    // Plantonista: aceito automaticamente, sem SLA (finaliza transbordo)
    status = 'aceito'
    expiraEm = null
    console.log(`[routeProspectAndNotify] ✅ Lead atribuído a PLANTONISTA - status='aceito', sem SLA`)
  }
  try {
    // Evitar criar atribuição duplicada caso esse método seja chamado mais de uma vez
    const activeCheck = await pool.query(
      `
      SELECT id, status
      FROM public.imovel_prospect_atribuicoes
      WHERE prospect_id = $1
        AND status IN ('atribuido', 'aceito')
      LIMIT 1
      `,
      [prospectId]
    )
    if (activeCheck.rows.length > 0) {
      console.log(`[routeProspectAndNotify] ⚠️  Atribuição ativa já existe para prospect ${prospectId}:`, activeCheck.rows[0]);
      return { success: false, reason: `Atribuição ativa já existe (status: ${activeCheck.rows[0].status})` }
    }

    await pool.query(
      `
      INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
      VALUES ($1, $2::uuid, $3, $4::jsonb, $5)
      `,
      [prospectId, broker.id, status, JSON.stringify(broker.motivo || {}), expiraEm]
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
    const yn = (v: any): string => (v === true ? 'Sim' : v === false ? 'Não' : '-')
    const toStr = (v: any): string => {
      if (v === null || v === undefined) return '-'
      const s = String(v).trim()
      return s ? s : '-'
    }
    const formatDateTime = (value: any): string => {
      if (!value) return '-'
      try {
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return '-'
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
      } catch {
        return '-'
      }
    }
    const joinParts = (parts: Array<any>) => parts.map((x) => String(x || '').trim()).filter(Boolean).join(', ')

    // Se o corretor não tiver e-mail, não disparar (evita tentativas inúteis).
    if (broker.email && String(broker.email).trim()) {
      // Link seguro: passa por /corretor/entrar (sem token na URL) e redireciona após login
      const painelUrl = buildCorretorPainelUrl(prospectId)
      const templateName = motivoType === 'imovel_corretor_fk'
        ? 'novo-lead-corretor-imovel-fk'
        : 'novo-lead-corretor'
      const imovelEnderecoCompleto = joinParts([
        p.endereco,
        p.numero ? `nº ${p.numero}` : '',
        p.complemento,
        p.bairro,
        p.cidade_fk,
        p.estado_fk,
        p.cep ? `CEP: ${p.cep}` : ''
      ])
      const proprietarioEnderecoCompleto = joinParts([
        p.proprietario_endereco,
        p.proprietario_numero ? `nº ${p.proprietario_numero}` : '',
        p.proprietario_complemento,
        p.proprietario_bairro,
        p.proprietario_cidade,
        p.proprietario_estado,
        p.proprietario_cep ? `CEP: ${p.proprietario_cep}` : ''
      ])
      await emailService.sendTemplateEmail(templateName, broker.email, {
        corretor_nome: broker.nome || 'Corretor',
        // Bloco 1: Imóvel (steps 1 e 2)
        codigo: toStr(p.codigo),
        titulo: toStr(p.titulo),
        descricao: toStr(p.descricao),
        tipo: toStr(p.tipo_nome),
        finalidade: toStr(p.finalidade_nome),
        status: toStr(p.status_nome),
        cidade: toStr(p.cidade_fk),
        estado: toStr(p.estado_fk),
        preco: formatCurrency(p.preco),
        preco_condominio: formatCurrency(p.preco_condominio),
        preco_iptu: formatCurrency(p.preco_iptu),
        taxa_extra: formatCurrency(p.taxa_extra),
        area_total: p.area_total !== null && p.area_total !== undefined ? `${p.area_total} m²` : '-',
        area_construida: p.area_construida !== null && p.area_construida !== undefined ? `${p.area_construida} m²` : '-',
        quartos: p.quartos !== null && p.quartos !== undefined ? String(p.quartos) : '-',
        banheiros: p.banheiros !== null && p.banheiros !== undefined ? String(p.banheiros) : '-',
        suites: p.suites !== null && p.suites !== undefined ? String(p.suites) : '-',
        vagas_garagem: p.vagas_garagem !== null && p.vagas_garagem !== undefined ? String(p.vagas_garagem) : '-',
        varanda: p.varanda !== null && p.varanda !== undefined ? String(p.varanda) : '-',
        andar: p.andar !== null && p.andar !== undefined ? String(p.andar) : '-',
        total_andares: p.total_andares !== null && p.total_andares !== undefined ? String(p.total_andares) : '-',
        mobiliado: yn(p.mobiliado),
        aceita_permuta: yn(p.aceita_permuta),
        aceita_financiamento: yn(p.aceita_financiamento),
        endereco_completo: imovelEnderecoCompleto || '-',
        latitude: p.latitude !== null && p.latitude !== undefined ? String(p.latitude) : '-',
        longitude: p.longitude !== null && p.longitude !== undefined ? String(p.longitude) : '-',
        // Bloco 2: Proprietário
        proprietario_nome: toStr(p.proprietario_nome),
        proprietario_cpf: toStr(p.proprietario_cpf),
        proprietario_telefone: toStr(p.proprietario_telefone),
        proprietario_email: toStr(p.proprietario_email),
        proprietario_endereco_completo: proprietarioEnderecoCompleto || '-',
        // Bloco 3: Cliente (Tenho interesse)
        cliente_nome: toStr(p.cliente_nome),
        cliente_telefone: toStr(p.cliente_telefone),
        cliente_email: toStr(p.cliente_email),
        data_interesse: formatDateTime(p.data_interesse),
        preferencia_contato: toStr(p.preferencia_contato || 'Não informado'),
        mensagem: toStr(p.mensagem || 'Sem mensagem'),
        painel_url: painelUrl
      })
    }
  } catch {
    // Não falhar o roteamento se o e-mail falhar
  }

  return { success: true }
}


