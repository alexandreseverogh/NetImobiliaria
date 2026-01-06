/**
 * Lead Router SLA Worker (MVP)
 * - Roda continuamente (cron a cada 1 minuto)
 * - Expira atribuições (status=atribuido AND expira_em <= NOW())
 * - Reatribui para outro corretor da área até o limite definido em parametros.proximos_corretores_recebem_leads
 * - Se exceder o limite (ou não houver próximos), direciona para corretor plantonista
 * - Envia email para o novo corretor (template: novo-lead-corretor)
 *
 * Execute: node scripts/lead-router-sla-worker.js
 */

require('dotenv').config({ path: '.env.local' })
const cron = require('node-cron')
const { Pool } = require('pg')
const nodemailer = require('nodemailer')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
})

const DEFAULT_SLA_MINUTES = 5

function appBaseUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
  return String(base).replace(/\/+$/, '')
}

function buildCorretorPainelUrl(prospectId) {
  const base = appBaseUrl()
  const next = `/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}`
  return `${base}/corretor/entrar?next=${encodeURIComponent(next)}`
}

async function getParametroProximosCorretores() {
  try {
    const r = await pool.query('SELECT proximos_corretores_recebem_leads FROM public.parametros LIMIT 1')
    const v = r.rows?.[0]?.proximos_corretores_recebem_leads
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return 3
    return n
  } catch {
    return 3
  }
}

async function getParametroSlaMinutosAceiteLead() {
  try {
    const r = await pool.query('SELECT sla_minutos_aceite_lead FROM public.parametros LIMIT 1')
    const v = r.rows?.[0]?.sla_minutos_aceite_lead
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_SLA_MINUTES
    return n
  } catch {
    return DEFAULT_SLA_MINUTES
  }
}

async function getEmailConfig() {
  const r = await pool.query('SELECT * FROM public.email_settings WHERE is_active = true LIMIT 1')
  if (!r.rows.length) throw new Error('Nenhuma configuração de email ativa (email_settings)')
  return r.rows[0]
}

async function getEmailTemplate(name) {
  const r = await pool.query('SELECT * FROM public.email_templates WHERE is_active = true AND name = $1 LIMIT 1', [name])
  if (!r.rows.length) throw new Error(`Template '${name}' não encontrado/ativo`)
  return r.rows[0]
}

function applyVars(str, vars) {
  let out = String(str || '')
  for (const [k, v] of Object.entries(vars || {})) {
    const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g')
    out = out.replace(re, String(v ?? ''))
  }
  return out
}

async function logEmailSend(templateName, toEmail, success, errorMessage) {
  try {
    await pool.query(
      `
      INSERT INTO public.email_logs (template_name, to_email, success, error_message, sent_at)
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [templateName, toEmail, !!success, errorMessage || null]
    )
  } catch (e) {
    // Nunca quebrar o worker por causa de log
    console.warn('⚠️ [LeadWorker] Falha ao gravar email_logs:', e?.message || e)
  }
}

async function logAudit(action, resource, resourceId, details) {
  try {
    await pool.query(
      `
      INSERT INTO public.audit_logs (user_id, user_type, action, resource, resource_id, details, ip_address, user_agent)
      VALUES (NULL, 'system', $1, $2, $3, $4::jsonb, NULL, NULL)
      `,
      [String(action), String(resource), resourceId ?? null, details ? JSON.stringify(details) : null]
    )
  } catch (e) {
    // Nunca quebrar worker por auditoria
    console.warn('⚠️ [LeadWorker] Falha ao registrar audit_logs (não crítico):', e?.message || e)
  }
}

function looksLikeInvalidRecipient(errorMessage) {
  const msg = String(errorMessage || '').toLowerCase()
  // Heurística simples (SMTP/providers variam). A ideia é cortar repetição quando o provedor rejeita o destinatário.
  return (
    msg.includes('recipient') ||
    msg.includes('address') ||
    msg.includes('user unknown') ||
    msg.includes('no such user') ||
    msg.includes('mailbox unavailable') ||
    msg.includes('invalid') ||
    msg.includes('550') ||
    msg.includes('553') ||
    msg.includes('5.1.1')
  )
}

async function markEmailBounce(toEmail, errorMessage) {
  try {
    // Só marca bounce para erros que parecem rejeição do destinatário
    if (!looksLikeInvalidRecipient(errorMessage)) return

    await pool.query(
      `
      INSERT INTO public.email_bounces (to_email, bounce_count, last_error, last_bounced_at, updated_at)
      VALUES ($1, 1, $2, NOW(), NOW())
      ON CONFLICT ((lower(to_email)))
      DO UPDATE SET
        bounce_count = public.email_bounces.bounce_count + 1,
        last_error = EXCLUDED.last_error,
        last_bounced_at = NOW(),
        updated_at = NOW()
      `,
      [toEmail, String(errorMessage || '')]
    )
  } catch (e) {
    console.warn('⚠️ [LeadWorker] Falha ao gravar email_bounces:', e?.message || e)
  }
}

async function isEmailBouncedRecently(toEmail, minutes = 180) {
  try {
    const r = await pool.query(
      `
      SELECT 1
      FROM public.email_bounces
      WHERE lower(to_email) = lower($1)
        AND last_bounced_at >= NOW() - ($2::text || ' minutes')::interval
      LIMIT 1
      `,
      [toEmail, String(minutes)]
    )
    return r.rows.length > 0
  } catch {
    return false
  }
}

async function sendTemplateEmail(to, templateName, variables) {
  const settings = await getEmailConfig()
  const template = await getEmailTemplate(templateName)

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: Number(settings.smtp_port || 587),
    secure: !!settings.smtp_secure,
    auth: settings.smtp_username
      ? { user: settings.smtp_username, pass: settings.smtp_password }
      : undefined
  })

  const subject = applyVars(template.subject, variables)
  const html = applyVars(template.html_content, variables)
  const text = applyVars(template.text_content, variables)

  try {
    // Anti-spam: se já deu bounce recentemente, não insistir.
    const bounced = await isEmailBouncedRecently(to, 180)
    if (bounced) {
      console.warn(`⚠️ [LeadWorker] Email bloqueado (bounce recente): ${to} (template=${templateName})`)
      await logEmailSend(templateName, to, false, 'Bloqueado: bounce recente')
      return false
    }

    const info = await transporter.sendMail({
      from: `"${settings.from_name || 'Net Imobiliária'}" <${settings.from_email || 'noreply@localhost'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    })
    await logEmailSend(templateName, to, true, null)
    console.log(`📧 [LeadWorker] Email enviado (${templateName}) para ${to} (${info?.messageId || 'sem messageId'})`)
    return true
  } catch (e) {
    const msg = e?.message || String(e)
    await logEmailSend(templateName, to, false, msg)
    await markEmailBounce(to, msg)
    console.warn(`⚠️ [LeadWorker] Falha ao enviar email (${templateName}) para ${to}:`, msg)
    return false
  }
}

async function getUserById(userId) {
  const r = await pool.query('SELECT id, nome, email FROM public.users WHERE id = $1::uuid LIMIT 1', [userId])
  return r.rows?.[0] || null
}

async function pickNextBrokerByArea(estado, cidade, prospectId) {
  // Mesma regra do roteamento inicial:
  // 1) menor carga (COUNT atribuições)
  // 2) empate: maior tempo sem receber (MAX created_at mais antigo; NULL primeiro)
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COUNT(a2.id) AS total_recebidos,
      MAX(a2.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND u.id NOT IN (
        SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
      )
    GROUP BY u.id, u.nome, u.email
    ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q, [estado, cidade, prospectId])
  if (!r.rows.length) return null
  return r.rows[0]
}

async function pickBrokerByAreaInitial(estado, cidade) {
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COUNT(a2.id) AS total_recebidos,
      MAX(a2.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
    GROUP BY u.id, u.nome, u.email
    ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q, [estado, cidade])
  if (!r.rows.length) return null
  return r.rows[0]
}

async function pickPlantonistaBroker() {
  // Plantonista por menor carga / maior tempo sem receber
  const q = `
    SELECT
      u.id, u.nome, u.email,
      COUNT(a2.id) AS total_recebidos,
      MAX(a2.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = true
    GROUP BY u.id, u.nome, u.email
    ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
    LIMIT 1
  `
  const r = await pool.query(q)
  if (!r.rows.length) return null
  return r.rows[0]
}

async function getLeadPayload(prospectId) {
  const q = `
    SELECT
      ip.id as prospect_id,
      ip.created_at as data_interesse,
      ip.preferencia_contato,
      ip.mensagem,
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
      i.cep,
      i.latitude,
      i.longitude,
      i.cidade_fk,
      i.estado_fk,
      i.corretor_fk,
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
    FROM public.imovel_prospects ip
    INNER JOIN public.imoveis i ON ip.id_imovel = i.id
    LEFT JOIN public.tipos_imovel ti ON i.tipo_fk = ti.id
    LEFT JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
    LEFT JOIN public.status_imovel si ON i.status_fk = si.id
    LEFT JOIN public.proprietarios pr ON pr.uuid = i.proprietario_uuid
    INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
    WHERE ip.id = $1
  `
  const r = await pool.query(q, [prospectId])
  return r.rows?.[0] || null
}

async function getUnassignedProspects(limit = 50) {
  const q = `
    SELECT ip.id AS prospect_id
    FROM public.imovel_prospects ip
    WHERE ip.created_at >= NOW() - INTERVAL '2 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.imovel_prospect_atribuicoes a
        WHERE a.prospect_id = ip.id
      )
    ORDER BY ip.id ASC
    LIMIT $1
  `
  const r = await pool.query(q, [limit])
  return r.rows || []
}

async function processUnassignedProspectsOnce() {
  const slaMinutes = await getParametroSlaMinutosAceiteLead()
  const rows = await getUnassignedProspects(50)
  if (!rows.length) return 0

  let processed = 0
  for (const row of rows) {
    const prospectId = Number(row.prospect_id)
    if (!prospectId) continue

    try {
      const payload = await getLeadPayload(prospectId)
      if (!payload) continue

      const estado = String(payload.estado_fk || '').trim()
      const cidade = String(payload.cidade_fk || '').trim()
      if (!estado || !cidade) continue

      // Regra: se o imóvel tiver corretor_fk, direciona direto (se ativo e corretor)
      let broker = null
      const imovelCorretorFk = payload.corretor_fk ? String(payload.corretor_fk).trim() : ''
      let directBroker = false
      if (imovelCorretorFk) {
        broker = await getUserById(imovelCorretorFk)
        directBroker = !!broker
      }
      if (!broker) broker = await pickBrokerByAreaInitial(estado, cidade)
      if (!broker) broker = await pickPlantonistaBroker()
      if (!broker) continue

      // REGRA CRÍTICA: se veio por imovel.corretor_fk, NÃO aplicar transbordo/SLA (expira_em = NULL)
      const expiraEm = directBroker ? null : new Date(Date.now() + slaMinutes * 60 * 1000)

      // Inserir atribuição (apenas se ainda estiver sem atribuição)
      await pool.query(
        `
        INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
        SELECT $1, $2::uuid, 'atribuido', $3::jsonb, $4
        WHERE NOT EXISTS (
          SELECT 1 FROM public.imovel_prospect_atribuicoes a WHERE a.prospect_id = $1
        )
        `,
        [
          prospectId,
          broker.id,
          JSON.stringify({ type: directBroker ? 'imovel_corretor_fk' : 'area_match', source: 'backfill_unassigned' }),
          expiraEm
        ]
      )

      // Notificar corretor escolhido
      if (broker.email) {
        const painelUrl = buildCorretorPainelUrl(prospectId)
        const templateName = directBroker ? 'novo-lead-corretor-imovel-fk' : 'novo-lead-corretor'
        const imovelEnderecoCompleto = joinParts([
          payload.endereco,
          payload.numero ? `nº ${payload.numero}` : '',
          payload.complemento,
          payload.bairro,
          payload.cidade_fk,
          payload.estado_fk,
          payload.cep ? `CEP: ${payload.cep}` : ''
        ])
        const proprietarioEnderecoCompleto = joinParts([
          payload.proprietario_endereco,
          payload.proprietario_numero ? `nº ${payload.proprietario_numero}` : '',
          payload.proprietario_complemento,
          payload.proprietario_bairro,
          payload.proprietario_cidade,
          payload.proprietario_estado,
          payload.proprietario_cep ? `CEP: ${payload.proprietario_cep}` : ''
        ])
        await sendTemplateEmail(broker.email, templateName, {
          corretor_nome: broker.nome || 'Corretor',
          // Bloco 1: Imóvel (steps 1 e 2)
          codigo: toStr(payload.codigo),
          titulo: toStr(payload.titulo),
          descricao: toStr(payload.descricao),
          tipo: toStr(payload.tipo_nome),
          finalidade: toStr(payload.finalidade_nome),
          status: toStr(payload.status_nome),
          cidade: toStr(payload.cidade_fk),
          estado: toStr(payload.estado_fk),
          preco: formatCurrency(payload.preco),
          preco_condominio: formatCurrency(payload.preco_condominio),
          preco_iptu: formatCurrency(payload.preco_iptu),
          taxa_extra: formatCurrency(payload.taxa_extra),
          area_total: payload.area_total !== null && payload.area_total !== undefined ? `${payload.area_total} m²` : '-',
          area_construida: payload.area_construida !== null && payload.area_construida !== undefined ? `${payload.area_construida} m²` : '-',
          quartos: payload.quartos !== null && payload.quartos !== undefined ? String(payload.quartos) : '-',
          banheiros: payload.banheiros !== null && payload.banheiros !== undefined ? String(payload.banheiros) : '-',
          suites: payload.suites !== null && payload.suites !== undefined ? String(payload.suites) : '-',
          vagas_garagem: payload.vagas_garagem !== null && payload.vagas_garagem !== undefined ? String(payload.vagas_garagem) : '-',
          varanda: payload.varanda !== null && payload.varanda !== undefined ? String(payload.varanda) : '-',
          andar: payload.andar !== null && payload.andar !== undefined ? String(payload.andar) : '-',
          total_andares: payload.total_andares !== null && payload.total_andares !== undefined ? String(payload.total_andares) : '-',
          mobiliado: yn(payload.mobiliado),
          aceita_permuta: yn(payload.aceita_permuta),
          aceita_financiamento: yn(payload.aceita_financiamento),
          endereco_completo: imovelEnderecoCompleto || '-',
          latitude: payload.latitude !== null && payload.latitude !== undefined ? String(payload.latitude) : '-',
          longitude: payload.longitude !== null && payload.longitude !== undefined ? String(payload.longitude) : '-',
          // Bloco 2: Proprietário
          proprietario_nome: toStr(payload.proprietario_nome),
          proprietario_cpf: toStr(payload.proprietario_cpf),
          proprietario_telefone: toStr(payload.proprietario_telefone),
          proprietario_email: toStr(payload.proprietario_email),
          proprietario_endereco_completo: proprietarioEnderecoCompleto || '-',
          // Bloco 3: Cliente (Tenho interesse)
          cliente_nome: toStr(payload.cliente_nome),
          cliente_telefone: toStr(payload.cliente_telefone),
          cliente_email: toStr(payload.cliente_email),
          data_interesse: formatDateTime(payload.data_interesse),
          preferencia_contato: toStr(payload.preferencia_contato || 'Não informado'),
          mensagem: toStr(payload.mensagem || 'Sem mensagem'),
          painel_url: painelUrl
        })
      }

      processed++
    } catch (e) {
      console.warn('⚠️ [LeadWorker] Falha ao backfill de prospect sem atribuição:', e?.message || e)
    }
  }

  return processed
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-'
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  } catch {
    return String(value)
  }
}

function yn(value) {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return '-'
}

function toStr(v) {
  if (v === null || v === undefined) return '-'
  const s = String(v).trim()
  return s ? s : '-'
}

function formatDateTime(value) {
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

function joinParts(parts) {
  return (parts || [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ')
}

async function processExpiredOnce() {
  const proximos = await getParametroProximosCorretores()
  const slaMinutes = await getParametroSlaMinutosAceiteLead()

  // Normalização defensiva: atribuições fixas (imovel_corretor_fk) não podem expirar.
  // Isso garante que não entrem em transbordo e não bloqueiem o aceite por expiração.
  try {
    await pool.query(
      `
      UPDATE public.imovel_prospect_atribuicoes
      SET expira_em = NULL
      WHERE status = 'atribuido'
        AND expira_em IS NOT NULL
        AND COALESCE(motivo->>'type','') = 'imovel_corretor_fk'
      `
    )
  } catch (e) {
    console.warn('⚠️ [LeadWorker] Falha ao normalizar expira_em para imovel_corretor_fk:', e?.message || e)
  }

  const expired = await pool.query(
    `
    SELECT id, prospect_id, corretor_fk
    FROM public.imovel_prospect_atribuicoes
    WHERE status = 'atribuido'
      AND expira_em IS NOT NULL
      AND expira_em <= NOW()
      AND COALESCE(motivo->>'type','') <> 'imovel_corretor_fk'
    ORDER BY expira_em ASC
    LIMIT 50
    `
  )

  if (!expired.rows.length) return 0

  let processed = 0
  for (const row of expired.rows) {
    const assignmentId = row.id
    const prospectId = row.prospect_id
    const prevBrokerId = row.corretor_fk

    try {
      await pool.query('BEGIN')

      const upd = await pool.query(
        `
        UPDATE public.imovel_prospect_atribuicoes
        SET status = 'expirado', atualizado_em = NOW()
        WHERE id = $1 AND status = 'atribuido'
        RETURNING prospect_id
        `,
        [assignmentId]
      )
      if (!upd.rows.length) {
        await pool.query('ROLLBACK')
        continue
      }

      // Auditoria: expirou por SLA (antes do transbordo)
      await logAudit('UPDATE', 'imovel_prospect_atribuicoes', assignmentId, {
        event: 'SLA_EXPIRED',
        prospect_id: prospectId,
        assignment_id: assignmentId,
        previous_corretor_fk: prevBrokerId
      })

      // Quantas tentativas (não-plantonista) já foram feitas?
      const attemptsQ = await pool.query(
        `
        SELECT COUNT(*)::int AS cnt
        FROM public.imovel_prospect_atribuicoes
        WHERE prospect_id = $1
          AND COALESCE(motivo->>'type','') <> 'fallback_plantonista'
        `,
        [prospectId]
      )
      const attempts = attemptsQ.rows?.[0]?.cnt ?? 0

      const payload = await getLeadPayload(prospectId)
      if (!payload) {
        await pool.query('COMMIT')
        processed++
        continue
      }

      const estado = String(payload.estado_fk || '').trim()
      const cidade = String(payload.cidade_fk || '').trim()

      let broker = null
      let motivo = null

      if (attempts < proximos) {
        broker = await pickNextBrokerByArea(estado, cidade, prospectId)
        if (broker) {
          motivo = {
            type: 'area_match',
            source: 'sla_transbordo',
            previous_corretor_fk: prevBrokerId,
            attempts: attempts + 1,
            limite: proximos
          }
        }
      }

      if (!broker) {
        broker = await pickPlantonistaBroker()
        if (broker) {
          motivo = {
            type: 'fallback_plantonista',
            source: 'sla_transbordo',
            previous_corretor_fk: prevBrokerId,
            attempts: attempts + 1,
            limite: proximos
          }
        }
      }

      if (!broker) {
        // Sem corretor elegível (nem plantonista): só marca expirado e segue.
        await pool.query('COMMIT')
        processed++
        continue
      }

      const expiraEm = new Date(Date.now() + slaMinutes * 60 * 1000)
      const newAssignRes = await pool.query(
        `
        INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
        VALUES ($1, $2::uuid, 'atribuido', $3::jsonb, $4)
        RETURNING id
        `,
        [prospectId, broker.id, JSON.stringify(motivo || {}), expiraEm]
      )
      const newAssignmentId = newAssignRes.rows?.[0]?.id ?? null

      await pool.query('COMMIT')

      // Auditoria: reatribuído (transbordo) para outro corretor/plantonista
      await logAudit('UPDATE', 'imovel_prospect_atribuicoes', newAssignmentId, {
        event: 'SLA_REASSIGNED',
        prospect_id: prospectId,
        previous_assignment_id: assignmentId,
        previous_corretor_fk: prevBrokerId,
        new_assignment_id: newAssignmentId,
        new_corretor_fk: broker.id,
        motivo: motivo || null,
        sla_minutes: slaMinutes
      })

      // Notificar novo corretor
      try {
        if (!broker?.email) {
          console.warn('⚠️ [LeadWorker] Corretor destino sem email; não foi possível notificar. corretor_fk=', broker?.id)
        } else {
          const painelUrl = buildCorretorPainelUrl(prospectId)
          const imovelEnderecoCompleto = joinParts([
            payload.endereco,
            payload.numero ? `nº ${payload.numero}` : '',
            payload.complemento,
            payload.bairro,
            payload.cidade_fk,
            payload.estado_fk,
            payload.cep ? `CEP: ${payload.cep}` : ''
          ])
          const proprietarioEnderecoCompleto = joinParts([
            payload.proprietario_endereco,
            payload.proprietario_numero ? `nº ${payload.proprietario_numero}` : '',
            payload.proprietario_complemento,
            payload.proprietario_bairro,
            payload.proprietario_cidade,
            payload.proprietario_estado,
            payload.proprietario_cep ? `CEP: ${payload.proprietario_cep}` : ''
          ])
          await sendTemplateEmail(broker.email, 'novo-lead-corretor', {
            corretor_nome: broker.nome || 'Corretor',
            // Bloco 1: Imóvel (steps 1 e 2)
            codigo: toStr(payload.codigo),
            titulo: toStr(payload.titulo),
            descricao: toStr(payload.descricao),
            tipo: toStr(payload.tipo_nome),
            finalidade: toStr(payload.finalidade_nome),
            status: toStr(payload.status_nome),
            cidade: toStr(payload.cidade_fk),
            estado: toStr(payload.estado_fk),
            preco: formatCurrency(payload.preco),
            preco_condominio: formatCurrency(payload.preco_condominio),
            preco_iptu: formatCurrency(payload.preco_iptu),
            taxa_extra: formatCurrency(payload.taxa_extra),
            area_total: payload.area_total !== null && payload.area_total !== undefined ? `${payload.area_total} m²` : '-',
            area_construida: payload.area_construida !== null && payload.area_construida !== undefined ? `${payload.area_construida} m²` : '-',
            quartos: payload.quartos !== null && payload.quartos !== undefined ? String(payload.quartos) : '-',
            banheiros: payload.banheiros !== null && payload.banheiros !== undefined ? String(payload.banheiros) : '-',
            suites: payload.suites !== null && payload.suites !== undefined ? String(payload.suites) : '-',
            vagas_garagem: payload.vagas_garagem !== null && payload.vagas_garagem !== undefined ? String(payload.vagas_garagem) : '-',
            varanda: payload.varanda !== null && payload.varanda !== undefined ? String(payload.varanda) : '-',
            andar: payload.andar !== null && payload.andar !== undefined ? String(payload.andar) : '-',
            total_andares: payload.total_andares !== null && payload.total_andares !== undefined ? String(payload.total_andares) : '-',
            mobiliado: yn(payload.mobiliado),
            aceita_permuta: yn(payload.aceita_permuta),
            aceita_financiamento: yn(payload.aceita_financiamento),
            endereco_completo: imovelEnderecoCompleto || '-',
            latitude: payload.latitude !== null && payload.latitude !== undefined ? String(payload.latitude) : '-',
            longitude: payload.longitude !== null && payload.longitude !== undefined ? String(payload.longitude) : '-',
            // Bloco 2: Proprietário
            proprietario_nome: toStr(payload.proprietario_nome),
            proprietario_cpf: toStr(payload.proprietario_cpf),
            proprietario_telefone: toStr(payload.proprietario_telefone),
            proprietario_email: toStr(payload.proprietario_email),
            proprietario_endereco_completo: proprietarioEnderecoCompleto || '-',
            // Bloco 3: Cliente (Tenho interesse)
            cliente_nome: toStr(payload.cliente_nome),
            cliente_telefone: toStr(payload.cliente_telefone),
            cliente_email: toStr(payload.cliente_email),
            data_interesse: formatDateTime(payload.data_interesse),
            preferencia_contato: toStr(payload.preferencia_contato || 'Não informado'),
            mensagem: toStr(payload.mensagem || 'Sem mensagem'),
            painel_url: painelUrl
          })
        }
      } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao enviar email para novo corretor:', e?.message || e)
      }

      // Opcional: avisar corretor anterior que perdeu o SLA (perdeu a oportunidade)
      try {
        const prevUser = await getUserById(prevBrokerId)
        if (prevUser?.email) {
          const painelUrl = `${appBaseUrl()}/corretor/leads`
          await sendTemplateEmail(prevUser.email, 'lead-perdido-sla', {
            corretor_nome: prevUser.nome || 'Corretor',
            codigo: String(payload.codigo || '-'),
            titulo: String(payload.titulo || 'Imóvel'),
            cidade: String(payload.cidade_fk || '-'),
            estado: String(payload.estado_fk || '-'),
            painel_url: painelUrl,
            sla_minutos: String(slaMinutes),
            tentativa_atual: String(Math.min(attempts, proximos)),
            limite_tentativas: String(proximos)
          })
        }
      } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao enviar email para corretor anterior (SLA expirado):', e?.message || e)
      }

      processed++
    } catch (e) {
      try {
        await pool.query('ROLLBACK')
      } catch {}
      console.error('❌ [LeadWorker] Erro processando expiração:', e?.message || e)
    }
  }

  return processed
}

async function tick() {
  try {
    const backfilled = await processUnassignedProspectsOnce()
    if (backfilled > 0) console.log(`✅ [LeadWorker] Backfill: atribuídos ${backfilled} prospects sem atribuição`)

    const n = await processExpiredOnce()
    if (n > 0) console.log(`✅ [LeadWorker] Reprocessados ${n} leads expirados`)
  } catch (e) {
    console.error('❌ [LeadWorker] Tick error:', e?.message || e)
  }
}

console.log('⏰ Lead Router SLA Worker rodando...')
console.log('   📅 Intervalo: a cada 1 minuto')
console.log('   🔁 Transbordo: até parametros.proximos_corretores_recebem_leads, depois plantonista\n')

// Rodar 1x ao subir
tick()

// Cron a cada 1 minuto
cron.schedule('* * * * *', tick, { timezone: 'America/Sao_Paulo' })


