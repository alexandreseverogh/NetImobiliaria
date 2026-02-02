import pool from '@/lib/database/connection'
import emailService from '@/services/emailService'
import fs from 'fs'
import path from 'path'

function debugLog(msg: string) {
  try {
    const logPath = path.join(process.cwd(), 'routing_debug.txt')
    const time = new Date().toISOString()
    fs.appendFileSync(logPath, `[${time}] ${msg}\n`)
  } catch (e) { }
}

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
  let url = fromEnv ? fromEnv.replace(/\/+$/, '') : 'http://localhost:3000'

  // Garantir que tenha protocolo
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url
  }
  return url
}

function buildCorretorPainelUrl(prospectId: number): string {
  const base = getAppBaseUrl()
  const next = `/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}`
  return `${base}/corretor/entrar?next=${encodeURIComponent(next)}`
}

function buildNegocioFechadoUrl(prospectId: number, imovelId: number): string {
  const base = getAppBaseUrl()
  const next = `/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}&openNegocioId=${encodeURIComponent(String(imovelId))}`
  return `${base}/corretor/entrar?next=${encodeURIComponent(next)}`
}

async function pickBrokerByArea(estado: string, cidade: string, excludeIds: string[] = [], runner: any = pool): Promise<RoutedBroker | null> {
  console.log(`🔍 [pickBrokerByArea] EXTERNAL - Buscando corretor externo para ${cidade}/${estado}`);
  console.log(`🔍 [pickBrokerByArea] EXTERNAL - excludeIds:`, excludeIds);

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
      AND u.tipo_corretor = 'Externo'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      u.created_at ASC
    LIMIT 1
  `
  const r = await runner.query(q, [estado, cidade, excludeIds || []])
  console.log(`🔍 [pickBrokerByArea] EXTERNAL - Resultado: ${r.rows.length} corretor(es) encontrado(s)`);

  if (r.rows.length === 0) {
    console.log(`❌ [pickBrokerByArea] EXTERNAL - NENHUM corretor externo encontrado para ${cidade}/${estado}`);
    return null
  }

  const row = r.rows[0]
  console.log(`✅ [pickBrokerByArea] EXTERNAL - Corretor selecionado: ${row.nome} (${row.id})`);

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'area_match', estado_fk: estado, cidade_fk: cidade, debug: `Lvl:${row.nivel} XP:${row.xp}` }
  }
}

async function pickBrokerById(corretorFk: string, runner: any = pool): Promise<RoutedBroker | null> {
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
  const r = await runner.query(q, [corretorFk])
  if (r.rows.length === 0) return null
  const row = r.rows[0]
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'imovel_corretor_fk', corretor_fk: row.id }
  }
}

async function pickInternalBrokerByArea(estado: string, cidade: string, excludeIds: string[] = [], runner: any = pool): Promise<RoutedBroker | null> {
  console.log(`🔍 [pickInternalBrokerByArea] INTERNAL - Buscando corretor interno para ${cidade}/${estado}`);
  console.log(`🔍 [pickInternalBrokerByArea] INTERNAL - excludeIds:`, excludeIds);

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
      AND u.tipo_corretor = 'Interno'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      u.created_at ASC
    LIMIT 1
  `
  const r = await runner.query(q, [estado, cidade, excludeIds || []])
  console.log(`🔍 [pickInternalBrokerByArea] INTERNAL - Resultado: ${r.rows.length} corretor(es) encontrado(s)`);

  if (r.rows.length === 0) {
    console.log(`❌ [pickInternalBrokerByArea] INTERNAL - NENHUM corretor interno encontrado para ${cidade}/${estado}`);
    return null
  }

  const row = r.rows[0]
  console.log(`✅ [pickInternalBrokerByArea] INTERNAL - Corretor selecionado: ${row.nome} (${row.id})`);

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    motivo: { type: 'area_match_internal', estado_fk: estado, cidade_fk: cidade, debug: `Lvl:${row.nivel} XP:${row.xp}` }
  }
}

async function pickPlantonistaBroker(excludeIds: string[] = [], estado?: string, cidade?: string, runner: any = pool): Promise<RoutedBroker | null> {
  console.log(`🔍 [pickPlantonistaBroker] PLANTONISTA - Buscando plantonista para ${cidade}/${estado}`);
  console.log(`🔍 [pickPlantonistaBroker] PLANTONISTA - excludeIds:`, excludeIds);

  // 1. Tentar Plantonista com Match de Área (Prioridade)
  if (estado && cidade) {
    console.log(`🔍 [pickPlantonistaBroker] PLANTONISTA - Tentando com área específica: ${cidade}/${estado}`);
    const qLocal = `
      SELECT
        u.id, u.nome, u.email,
        COALESCE(cs.nivel, 0) as nivel,
        COALESCE(cs.xp_total, 0) as xp,
        COUNT(a.id) AS total_recebidos,
        MAX(a.created_at) AS ultimo_recebimento
      FROM public.users u
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id -- JOIN com área
      LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = true
        AND COALESCE(u.tipo_corretor, 'Interno') = 'Interno'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
      ORDER BY 
        COUNT(a.id) ASC, 
        MAX(a.created_at) ASC NULLS FIRST, 
        COALESCE(cs.nivel, 0) DESC,
        COALESCE(cs.xp_total, 0) DESC,
        u.created_at ASC
      LIMIT 1
    `
    const rLocal = await runner.query(qLocal, [estado, cidade, excludeIds || []])
    console.log(`🔍 [pickPlantonistaBroker] PLANTONISTA (área) - Resultado: ${rLocal.rows.length} plantonista(s) encontrado(s)`);

    if (rLocal.rows.length > 0) {
      const row = rLocal.rows[0]
      console.log(`✅ [pickPlantonistaBroker] PLANTONISTA (área) - Selecionado: ${row.nome} (${row.id})`);
      return {
        id: row.id,
        nome: row.nome,
        email: row.email,
        motivo: { type: 'fallback_plantonista_area', debug: `Lvl:${row.nivel} Area:${cidade}/${estado}` }
      }
    }
  }

  // 2. Fallback: Qualquer Plantonista (Global)
  console.log(`🔍 [pickPlantonistaBroker] PLANTONISTA - Tentando plantonista global (sem área específica)`);
  const qGlobal = `
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
      AND u.tipo_corretor = 'Interno' -- Plantonista deve ser interno? User disse que sim.
      AND (CASE WHEN array_length($1::uuid[], 1) > 0 THEN u.id != ALL($1::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      u.created_at ASC
    LIMIT 1
  `
  const rGlobal = await runner.query(qGlobal, [excludeIds || []])
  console.log(`🔍 [pickPlantonistaBroker] PLANTONISTA (global) - Resultado: ${rGlobal.rows.length} plantonista(s) encontrado(s)`);

  if (rGlobal.rows.length === 0) {
    console.log(`❌ [pickPlantonistaBroker] PLANTONISTA - NENHUM plantonista encontrado`);
    return null
  }

  const row = rGlobal.rows[0]
  console.log(`✅ [pickPlantonistaBroker] PLANTONISTA (global) - Selecionado: ${row.nome} (${row.id})`);

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
  options?: {
    forceFallback?: boolean;
    targetTier?: 'External' | 'Internal' | 'Plantonista';
    dbClient?: any; // Permite passar um cliente de transação ativa para evitar deadlock
  }
): Promise<{ success: boolean; reason?: string }> {
  debugLog(`Starting routing for prospect ${prospectId}`)
  const runner = options?.dbClient || pool;

  // Buscar dados do prospect com imóvel e cliente (para roteamento e email)
  const dataQuery = await runner.query(
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
  debugLog(`Location: ${cidade}/${estado}`)
  if (!estado || !cidade) {
    debugLog(`Failed: Imóvel sem estado/cidade`)
    return { success: false, reason: 'Imóvel sem estado/cidade' }
  }

  // REGRA: se o imóvel tiver corretor_fk definido (captação), o lead vai direto para ele.
  let broker: RoutedBroker | null = null
  const imovelCorretorFk = p.corretor_fk ? String(p.corretor_fk).trim() : ''
  if (imovelCorretorFk) {
    broker = await pickBrokerById(imovelCorretorFk, runner)
  }

  // Se não tem dono fixo...
  // Helper para buscar SLA interno
  async function getSlaMinutosAceiteLeadInterno(): Promise<number> {
    try {
      const r = await runner.query('SELECT sla_minutos_aceite_lead_interno FROM public.parametros LIMIT 1')
      const v = r.rows?.[0]?.sla_minutos_aceite_lead_interno
      const n = Number(v)
      if (!Number.isFinite(n) || n <= 0) return 15 // Default 15 min internal
      return n
    } catch {
      return 15
    }
  }

  // 1. Tentar por Área (External) - SE targetTier for External (ou padrão)
  const targetTier = options?.targetTier || 'External'; // 'External' | 'Internal' | 'Plantonista'
  console.log(`\n🎯 [routeProspectAndNotify] ========== INICIANDO ROTEAMENTO ==========`);
  console.log(`🎯 [routeProspectAndNotify] Prospect ID: ${prospectId}`);
  console.log(`🎯 [routeProspectAndNotify] Localização: ${cidade}/${estado}`);
  console.log(`🎯 [routeProspectAndNotify] Target Tier: ${targetTier}`);
  console.log(`🎯 [routeProspectAndNotify] Force Fallback: ${options?.forceFallback || false}`);
  console.log(`🎯 [routeProspectAndNotify] Exclude IDs: ${excludeIds.length} corretor(es) excluído(s)`);

  if (!broker && targetTier === 'External' && !options?.forceFallback) {
    console.log(`\n🔄 [routeProspectAndNotify] TIER 1: Tentando EXTERNAL...`);
    broker = await pickBrokerByArea(estado, cidade, excludeIds, runner)
    if (broker) {
      console.log(`✅ [routeProspectAndNotify] TIER 1: EXTERNAL encontrado - ${broker.nome}`);
    } else {
      console.log(`⚠️ [routeProspectAndNotify] TIER 1: EXTERNAL não encontrado - passando para INTERNAL`);
    }
  }

  // 2. Tentar Interno (Tier 2) - Se targetTier for Internal OU se External falhou
  // NOTA: Se targetTier='External', o fallback natural é tentar Interno se não achou externo?
  // User Requirement: "A lógica ... primeiro externos ... depois internos ... depois plantonista".
  // Sim, fallback natural.
  if (!broker && (targetTier === 'External' || targetTier === 'Internal')) {
    // Só tenta interno se não estivermos "forçando" plantonista via forceFallback
    if (!options?.forceFallback) {
      console.log(`\n🔄 [routeProspectAndNotify] TIER 2: Tentando INTERNAL...`);
      broker = await pickInternalBrokerByArea(estado, cidade, excludeIds, runner)
      if (broker) {
        console.log(`✅ [routeProspectAndNotify] TIER 2: INTERNAL encontrado - ${broker.nome}`);
      } else {
        console.log(`⚠️ [routeProspectAndNotify] TIER 2: INTERNAL não encontrado - passando para PLANTONISTA`);
      }
    }
  }

  // 3. Tentar Plantonista
  if (!broker) {
    console.log(`\n🔄 [routeProspectAndNotify] TIER 3: Tentando PLANTONISTA...`);
    broker = await pickPlantonistaBroker(excludeIds, estado, cidade, runner)
    if (broker) {
      console.log(`✅ [routeProspectAndNotify] TIER 3: PLANTONISTA encontrado - ${broker.nome}`);
    } else {
      console.log(`❌ [routeProspectAndNotify] TIER 3: PLANTONISTA não encontrado - FALHA TOTAL`);
    }
  }

  if (!broker) {
    debugLog(`Failed: No broker found`)
    console.log(`\n❌ [routeProspectAndNotify] ========== ROTEAMENTO FALHOU ==========\n`);
    return { success: false, reason: 'Nenhum corretor elegível (sem área e sem plantonista)' }
  }

  debugLog(`Broker selected: ${broker.nome} (${broker.id})`)

  console.log(`\n✅ [routeProspectAndNotify] ========== ROTEAMENTO CONCLUÍDO ==========`);
  console.log(`✅ [routeProspectAndNotify] Corretor selecionado: ${broker.nome} (${broker.id})`);
  console.log(`✅ [routeProspectAndNotify] Motivo: ${JSON.stringify(broker.motivo)}\n`);


  // Criar atribuição com SLA (minutos configurável em parametros)
  let slaMinutos = 5
  const motivoType = String((broker as any)?.motivo?.type || '')

  if (motivoType === 'area_match_internal') {
    slaMinutos = await getSlaMinutosAceiteLeadInterno()
  } else {
    slaMinutos = await getSlaMinutosAceiteLead()
  }

  // REGRA CRÍTICA: se veio por imovel.corretor_fk, NÃO aplicar transbordo (expira_em = NULL)
  // const motivoType already defined above
  const isPlantonista = motivoType.startsWith('fallback_plantonista') // Matches both 'fallback_plantonista' and 'fallback_plantonista_area'

  // Determinar status e expira_em baseado no tipo de atribuição
  let status: 'atribuido' | 'aceito' = 'atribuido'
  let expiraEm: Date | null = new Date(Date.now() + slaMinutos * 60 * 1000)

  if (motivoType === 'imovel_corretor_fk') {
    // Corretor fixo do imóvel: auto-aceite, sem SLA
    status = 'aceito'
    expiraEm = null
  } else if (isPlantonista) {
    // Plantonista: aceito automaticamente, sem SLA (finaliza transbordo)
    status = 'aceito'
    expiraEm = null
    if (status === 'aceito') {
      // REGRA DE NEGÓCIO: Se o lead foi aceito automaticamente (Dono fixo ou Plantonista),
      // vinculamos esse corretor como o responsável pelo imóvel.
      try {
        await runner.query(`
          UPDATE imoveis i
          SET corretor_fk = $1::uuid,
              updated_at = NOW()
          FROM imovel_prospects ip
          WHERE ip.id = $2
            AND ip.id_imovel = i.id
        `, [broker.id, prospectId]);
        console.log(`[routeProspectAndNotify] 🏠 Imóvel vinculado ao corretor ${broker.nome} (Status: aceito)`);
      } catch (errAssign) {
        console.error('[routeProspectAndNotify] Erro ao vincular corretor ao imóvel:', errAssign);
      }
    }
  }
  try {
    // Evitar criar atribuição duplicada caso esse método seja chamado mais de uma vez
    const activeCheck = await runner.query(
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

    await runner.query(
      `
      INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em, data_aceite)
      VALUES ($1::integer, $2::uuid, $3::text, $4::jsonb, $5::timestamp with time zone, CASE WHEN $3::text = 'aceito' THEN NOW() ELSE NULL END)
      `,
      [prospectId, broker.id, status, JSON.stringify(broker.motivo || {}), expiraEm]
    )
    debugLog(`Success: Assignment created`)
  } catch (e: any) {
    debugLog(`Failed: Error creating assignment: ${e.message}`)
    return { success: false, reason: 'Falha ao criar atribuição' }
  }

  // Helpers de formatação (movidos para escopo externo para reuso)
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
      // Force 'America/Sao_Paulo' timezone
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  const formatMultiLine = (text: string): string => {
    if (!text) return '-'
    // Remove literal \r\n characters which might appear in JSON dumps
    let clean = text.replace(/\\r\\n/g, '<br>').replace(/\\n/g, '<br>')
    // Replace actual newlines
    clean = clean.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>')
    return clean
  }
  const joinParts = (parts: Array<any>) => parts.map((x) => String(x || '').trim()).filter(Boolean).join(', ')

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

  // Enviar email ao corretor (aceite necessário)
  try {
    // Se o corretor não tiver e-mail, não disparar (evita tentativas inúteis).
    if (broker.email && String(broker.email).trim()) {
      // Link seguro: passa por /corretor/entrar (sem token na URL) e redireciona após login
      const painelUrl = buildCorretorPainelUrl(prospectId)
      const templateName = motivoType === 'imovel_corretor_fk'
        ? 'novo-lead-corretor-imovel-fk'
        : 'novo-lead-corretor'

      console.log('[prospectRouter] 📧 Preparando envio de email para corretor:', broker.email);
      console.log('[prospectRouter] Template:', templateName);
      console.log('[prospectRouter] Dados Proprietário:', {
        nome: p.proprietario_nome,
        uuid: p.proprietario_uuid, // precisar adicionar uuid no select se quiser logar
        cpf: p.proprietario_cpf
      });

      const negocioFechadoUrl = buildNegocioFechadoUrl(prospectId, p.imovel_id)

      // Lógica de condicional do assunto (solicitação do usuário)
      // Se for plantonista (ou auto-aceite), remove msg de "aceite necessário"
      const aceiteMsg = (status === 'aceito') ? '' : '(aceite necessário)'

      // Lógica de condicional de instrução
      // Se for plantonista, suprime a instrução "acesse o painel e aceite o lead"
      const instructionMsg = (status === 'aceito')
        ? ''
        : 'Para iniciar o atendimento, acesse o painel e <strong>aceite o lead</strong>.'

      await emailService.sendTemplateEmail(templateName, broker.email, {
        corretor_nome: broker.nome || 'Corretor',
        aceite_msg: aceiteMsg,
        instruction_msg: instructionMsg,
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
        proprietario_cpf: status === 'aceito' ? toStr(p.proprietario_cpf) : '-',
        proprietario_telefone: status === 'aceito' ? toStr(p.proprietario_telefone) : '-',
        proprietario_email: status === 'aceito' ? toStr(p.proprietario_email) : '-',
        proprietario_endereco_completo: status === 'aceito' ? (proprietarioEnderecoCompleto || '-') : '-',
        // Bloco 3: Cliente (Tenho interesse)
        cliente_nome: toStr(p.cliente_nome),
        cliente_telefone: toStr(p.cliente_telefone),
        cliente_email: toStr(p.cliente_email),
        data_interesse: formatDateTime(p.data_interesse),
        preferencia_contato: toStr(p.preferencia_contato || 'Não informado'),
        mensagem: formatMultiLine(p.mensagem || 'Sem mensagem'),
        painel_url: painelUrl,
        negocio_fechado_url: negocioFechadoUrl
      })
    }

    // ---------------------------------------------------------------------
    // Notificação ao Cliente (Auto-Aceite)
    // Se o status já nasceu 'aceito' (ex: Plantonista ou Dono do Imóvel),
    // o cliente deve saber IMEDIATAMENTE quem é o corretor.
    // (No caso manual, isso é feito em accept/route.ts)
    // ---------------------------------------------------------------------
    if (status === 'aceito' && p.cliente_email) {
      console.log(`[prospectRouter] 📧 Enviando notificação para CLIENTE(Auto - Aceite) - ${p.cliente_email}`);
      try {
        // Precisamos buscar dados extras do corretor (foto, telefone, creci) que não temos completos em 'broker' (RoutedBroker)
        // RoutedBroker tem apenas ID, Nome, Email.
        // Fazer query rápida para enriquecer
        const corretorDetailsRes = await runner.query('SELECT telefone, creci, foto FROM users WHERE id = $1', [broker.id]);
        const cDetails = corretorDetailsRes.rows[0] || {};

        await emailService.sendTemplateEmail(
          'lead_accepted_client_notification',
          p.cliente_email,
          {
            cliente_nome: p.cliente_nome || 'Cliente',
            imovel_titulo: toStr(p.titulo),
            imovel_codigo: toStr(p.codigo),
            corretor_nome: broker.nome || 'Corretor', // Aqui já é o nome real do user
            corretor_telefone: cDetails.telefone || toStr(broker.email),
            corretor_email: broker.email || '',
            corretor_creci: cDetails.creci || '-',
            year: new Date().getFullYear().toString(),
            // Dados enriquecidos do template
            preco: formatCurrency(p.preco),
            endereco_completo: imovelEnderecoCompleto || '-',
            cidade_estado: `${toStr(p.cidade_fk)
              } / ${toStr(p.estado_fk)}`,
            area_total: p.area_total !== null && p.area_total !== undefined ? `${p.area_total} m²` : '-',
            quartos: p.quartos !== null && p.quartos !== undefined ? String(p.quartos) : '-',
            suites: p.suites !== null && p.suites !== undefined ? String(p.suites) : '-',
            vagas_garagem: p.vagas_garagem !== null && p.vagas_garagem !== undefined ? String(p.vagas_garagem) : '-',

            proprietario_nome: toStr(p.proprietario_nome),
            proprietario_cpf: toStr(p.proprietario_cpf),
            proprietario_telefone: toStr(p.proprietario_telefone),
            proprietario_email: toStr(p.proprietario_email),
            proprietario_endereco: proprietarioEnderecoCompleto || '-',

            data_interesse: formatDateTime(p.data_interesse),
            preferencia_contato: toStr(p.preferencia_contato || 'Não informado'),
            mensagem: formatMultiLine(p.mensagem || 'Sem mensagem')
          },
          cDetails.foto ? [{
            filename: 'broker.jpg',
            content: cDetails.foto,
            cid: 'broker_photo'
          }] : []
        );
      } catch (clientEmailErr) {
        console.error('[prospectRouter] ❌ Erro ao notificar cliente (Auto-Aceite):', clientEmailErr);
      }
    }
  } catch (emailError) {
    console.error('[prospectRouter] ❌ Falha ao enviar notificação por email:', emailError);
    // Não falhar o roteamento se o e-mail falhar
  }

  return { success: true }
}


