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
      ip.preferencia_contato,
      ip.mensagem,
      i.codigo,
      i.titulo,
      i.preco,
      i.cidade_fk,
      i.estado_fk,
      i.corretor_fk,
      c.nome as cliente_nome,
      c.email as cliente_email,
      c.telefone as cliente_telefone
    FROM public.imovel_prospects ip
    INNER JOIN public.imoveis i ON ip.id_imovel = i.id
    INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
    WHERE ip.id = $1
  `
  const r = await pool.query(q, [prospectId])
  return r.rows?.[0] || null
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-'
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  } catch {
    return String(value)
  }
}

async function processExpiredOnce() {
  const proximos = await getParametroProximosCorretores()
  const slaMinutes = await getParametroSlaMinutosAceiteLead()

  const expired = await pool.query(
    `
    SELECT id, prospect_id, corretor_fk
    FROM public.imovel_prospect_atribuicoes
    WHERE status = 'atribuido'
      AND expira_em IS NOT NULL
      AND expira_em <= NOW()
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
      await pool.query(
        `
        INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
        VALUES ($1, $2::uuid, 'atribuido', $3::jsonb, $4)
        `,
        [prospectId, broker.id, JSON.stringify(motivo || {}), expiraEm]
      )

      await pool.query('COMMIT')

      // Notificar novo corretor
      try {
        if (!broker?.email) {
          console.warn('⚠️ [LeadWorker] Corretor destino sem email; não foi possível notificar. corretor_fk=', broker?.id)
        } else {
          const painelUrl = `${appBaseUrl()}/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}`
          await sendTemplateEmail(broker.email, 'novo-lead-corretor', {
            corretor_nome: broker.nome || 'Corretor',
            codigo: String(payload.codigo || '-'),
            titulo: String(payload.titulo || 'Imóvel'),
            cidade: String(payload.cidade_fk || '-'),
            estado: String(payload.estado_fk || '-'),
            preco: formatCurrency(payload.preco),
            cliente_nome: String(payload.cliente_nome || '-'),
            cliente_telefone: String(payload.cliente_telefone || '-'),
            cliente_email: String(payload.cliente_email || '-'),
            preferencia_contato: String(payload.preferencia_contato || 'Não informado'),
            mensagem: String(payload.mensagem || 'Sem mensagem'),
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


