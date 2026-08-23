import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'
import {
  createEventUsuario,
  createEventEmpresa,
  deleteEventUsuario,
  deleteEventEmpresa,
  getUserRefreshToken,
  getTenantCalendarConfig,
} from '@/lib/google/calendarService'
import {
  sendConfirmacaoCorretor,
  sendConfirmacaoLead,
} from '@/lib/google/emailService'

const TZ = 'America/Recife'

// ── GET /api/crm/agendamentos?lead_uuid=xxx ────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const leadUuid = request.nextUrl.searchParams.get('lead_uuid')
  if (!leadUuid) {
    return NextResponse.json({ error: 'Parâmetro lead_uuid obrigatório' }, { status: 400 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.nome as corretor_nome, u.email as corretor_email
       FROM agendamentos a
       LEFT JOIN users u ON u.id::text = a.usuario_id
       WHERE a.lead_uuid = $1
       ORDER BY a.data_hora_inicio DESC`,
      [leadUuid]
    )
    return NextResponse.json({ success: true, agendamentos: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST /api/crm/agendamentos ─────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const userId = auth.payload!.userId

  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { lead_uuid, data_hora_inicio, observacoes, tenant_id } = body
  if (!lead_uuid || !data_hora_inicio) {
    return NextResponse.json({ error: 'lead_uuid e data_hora_inicio são obrigatórios' }, { status: 400 })
  }

  try {
    // 1. Carregar dados do usuário + tenant (filtrando por tenantId fornecido ou padrão)
    const { rows: userRows } = await pool.query(
      `SELECT u.id, u.nome, u.email, u.google_refresh_token, u.google_calendar_authorized,
              tm.tenant_id,
              t.calendario, t.google_email, t.duracao_visita
       FROM users u
       INNER JOIN user_tenant_membership tm ON tm.user_id = u.id
       LEFT JOIN tenants t ON t.id = tm.tenant_id
       WHERE u.id = $1 AND (tm.tenant_id = $2 OR $2 IS NULL)
       LIMIT 1`,
      [userId, tenant_id]
    )
    const user = userRows[0]
    if (!user) return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 404 })
    if (!user.calendario) {
      console.warn('❌ [Agendamento] Calendário desabilitado para tenant:', user.tenant_id)
      return NextResponse.json({ error: 'Módulo de agendamentos desabilitado para este tenant', code: 'MODULE_DISABLED' }, { status: 403 })
    }
    if (!user.google_email) {
      return NextResponse.json({ error: 'E-mail Google da empresa não configurado. Peça a um administrador para configurar em Configurações da Empresa.', code: 'NO_COMPANY_EMAIL' }, { status: 503 })
    }
    // Conexão pessoal do atendente com o Google Calendar é opcional (ver 4. abaixo) — o
    // calendário da EMPRESA (google_email + Service Account) já é suficiente pra agendar.

    // 2. Calcular data_hora_fim
    const duracao = user.duracao_visita || 60
    const inicio = new Date(data_hora_inicio)
    const fim = new Date(inicio.getTime() + duracao * 60 * 1000)

    // 3. Carregar dados do lead + imóvel
    const { rows: leadRows } = await pool.query(
      `SELECT ls.nome, ls.email, ls.telefone, ls.imovel_id,
              c.email as cliente_email,
              i.titulo as imovel_nome
       FROM leads_staging ls
       LEFT JOIN clientes c ON c.email = ls.email
       LEFT JOIN imoveis i ON i.id = ls.imovel_id
       WHERE ls.lead_uuid = $1`,
      [lead_uuid]
    )
    const lead = leadRows[0]
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    const eventoBase = {
      summary: `Visita: ${lead.nome || 'Cliente'}${lead.imovel_nome ? ` — ${lead.imovel_nome}` : ''}`,
      description: [
        `Cliente: ${lead.nome || '—'}`,
        `Telefone: ${lead.telefone || '—'}`,
        `E-mail: ${lead.email || '—'}`,
        observacoes ? `Observações: ${observacoes}` : null,
        `Agendado por: ${user.nome}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: inicio.toISOString(), timeZone: TZ },
      end:   { dateTime: fim.toISOString(),    timeZone: TZ },
      attendees: [
        { email: user.email, displayName: user.nome },
        ...(lead.email ? [{ email: lead.email, displayName: lead.nome }] : []),
      ],
    }

    // 4. Criar eventos nos dois calendários em paralelo — o pessoal só é tentado se o
    // atendente já conectou a própria conta (best-effort, nunca bloqueia o agendamento);
    // o da empresa (Service Account) é o que sempre roda, já que é o único garantido pela
    // config do tenant.
    const [eventoUsuario, eventoEmpresa] = await Promise.all([
      user.google_calendar_authorized && user.google_refresh_token
        ? createEventUsuario(user.google_refresh_token, eventoBase).catch(e => {
            console.error('[Agendamento] Erro ao criar evento usuário:', e.message)
            return null
          })
        : Promise.resolve(null),
      createEventEmpresa(user.google_email, {
        ...eventoBase,
        summary: `[${user.nome}] ${eventoBase.summary}`,
      }).catch(e => {
        console.error('[Agendamento] Erro ao criar evento empresa:', e.message)
        return null
      }),
    ])

    // 5. Persistir no banco
    const { rows: insertRows } = await pool.query(
      `INSERT INTO agendamentos
         (tenant_id, lead_uuid, usuario_id, imovel_id, data_hora_inicio, data_hora_fim,
          google_event_id_usuario, google_event_id_empresa, status, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'agendado',$9)
       RETURNING *`,
      [
        user.tenant_id,
        lead_uuid,
        userId,
        lead.imovel_id || null,
        inicio.toISOString(),
        fim.toISOString(),
        eventoUsuario?.eventId || null,
        eventoEmpresa?.eventId || null,
        observacoes || null,
      ]
    )
    const agendamento = insertRows[0]

    // 6. Enviar e-mails (em background — sem bloquear a resposta)
    const emailParams = {
      corretorNome:  user.nome,
      leadNome:      lead.nome || 'Cliente',
      leadEmail:     lead.email || '',
      leadTelefone:  lead.telefone,
      imovelNome:    lead.imovel_nome,
      dataHoraInicio: inicio.toISOString(),
      dataHoraFim:   fim.toISOString(),
      observacoes,
      googleEventLink: eventoUsuario?.htmlLink,
    }

    Promise.all([
      sendConfirmacaoCorretor({ to: user.email, ...emailParams })
        .then(() => pool.query('UPDATE agendamentos SET email_corretor_enviado=true WHERE id=$1', [agendamento.id]))
        .catch(e => console.warn('[Email Corretor]', e.message)),

      (lead.cliente_email || lead.email)
        ? sendConfirmacaoLead({
            to: lead.cliente_email || lead.email,
            leadNome: lead.nome || 'Cliente',
            corretorNome: user.nome,
            imovelNome: lead.imovel_nome,
            dataHoraInicio: inicio.toISOString(),
            dataHoraFim: fim.toISOString(),
            observacoes,
          })
          .then(() => pool.query('UPDATE agendamentos SET email_lead_enviado=true WHERE id=$1', [agendamento.id]))
          .catch(e => console.warn('[Email Lead]', e.message))
        : Promise.resolve(),
    ])

    return NextResponse.json({ success: true, agendamento }, { status: 201 })
  } catch (err: any) {
    console.error('[POST Agendamento] Erro:', err.message)
    return NextResponse.json({ error: 'Erro interno ao criar agendamento', details: err.message }, { status: 500 })
  }
}
