/**
 * Email Service — Confirmações de Agendamento de Visita
 * Usa nodemailer (já instalado no projeto)
 */

import nodemailer from 'nodemailer'

// ── Transporter ────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      // Senha de app do Gmail costuma ser colada com os espaços que o Google exibe na
      // tela (4 blocos de 4) — o valor real não tem espaço nenhum, e a autenticação
      // SMTP rejeita silenciosamente se vier com eles. Remove aqui pra nunca depender de
      // quem colou ter tirado os espaços manualmente.
      pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
    },
  })
}

// ── Formatar data/hora em PT-BR ────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'America/Recife',
  })
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife',
  })
  return { data, hora }
}

// ── Base HTML ──────────────────────────────────────────────────

function baseHtml(conteudo: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agendamento de Visita</title>
  <style>
    body { margin:0; padding:0; font-family: 'Segoe UI', Arial, sans-serif; background:#0f172a; color:#e2e8f0; }
    .wrapper { max-width:600px; margin:0 auto; padding:32px 16px; }
    .card { background:#1e293b; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); }
    .header { background:linear-gradient(135deg,#1d4ed8,#4338ca); padding:32px; text-align:center; }
    .header-icon { font-size:48px; margin-bottom:12px; }
    .header h1 { margin:0; color:#fff; font-size:22px; font-weight:800; letter-spacing:-0.5px; }
    .body { padding:32px; }
    .info-row { display:flex; align-items:flex-start; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
    .info-row:last-child { border-bottom:none; }
    .info-icon { width:36px; height:36px; background:rgba(99,102,241,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; margin-right:14px; }
    .info-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
    .info-value { font-size:15px; font-weight:600; color:#f1f5f9; }
    .cta-box { margin:24px 0 0; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); border-radius:12px; padding:20px; text-align:center; }
    .cta-box p { margin:0 0 14px; font-size:13px; color:#94a3b8; }
    .cta-btn { display:inline-block; background:#2563eb; color:#fff; padding:12px 28px; border-radius:10px; font-weight:700; font-size:13px; text-decoration:none; letter-spacing:0.5px; }
    .badge { display:inline-block; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); border-radius:999px; padding:4px 14px; font-size:12px; font-weight:700; }
    .footer { padding:20px 32px; text-align:center; color:#475569; font-size:11px; border-top:1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      ${conteudo}
      <div class="footer">Este é um e-mail automático. Por favor, não responda diretamente a ele.</div>
    </div>
  </div>
</body>
</html>
`
}

// ── E-mail para o Corretor ─────────────────────────────────────

export async function sendConfirmacaoCorretor(params: {
  to: string
  corretorNome: string
  leadNome: string
  leadEmail: string
  leadTelefone?: string
  imovelNome?: string
  dataHoraInicio: string
  dataHoraFim: string
  observacoes?: string
  googleEventLink?: string
}) {
  const { data, hora } = formatDateTime(params.dataHoraInicio)
  const { hora: horaFim } = formatDateTime(params.dataHoraFim)

  const html = baseHtml(`
    <div class="header">
      <div class="header-icon">📅</div>
      <h1>Visita Agendada com Sucesso</h1>
      <div style="margin-top:10px;"><span class="badge">✓ Confirmado</span></div>
    </div>
    <div class="body">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
        Olá, <strong style="color:#f1f5f9;">${params.corretorNome}</strong>! Sua visita foi registrada no sistema e no seu Google Calendar.
      </p>
      <div class="info-row">
        <div class="info-icon">📆</div>
        <div>
          <div class="info-label">Data</div>
          <div class="info-value">${data}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-icon">🕐</div>
        <div>
          <div class="info-label">Horário</div>
          <div class="info-value">${hora} às ${horaFim}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-icon">👤</div>
        <div>
          <div class="info-label">Cliente</div>
          <div class="info-value">${params.leadNome}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${params.leadEmail}${params.leadTelefone ? ` • ${params.leadTelefone}` : ''}</div>
        </div>
      </div>
      ${params.imovelNome ? `
      <div class="info-row">
        <div class="info-icon">🏠</div>
        <div>
          <div class="info-label">Imóvel</div>
          <div class="info-value">${params.imovelNome}</div>
        </div>
      </div>` : ''}
      ${params.observacoes ? `
      <div class="info-row">
        <div class="info-icon">📝</div>
        <div>
          <div class="info-label">Observações</div>
          <div class="info-value" style="font-size:13px;font-weight:400;">${params.observacoes}</div>
        </div>
      </div>` : ''}
      ${params.googleEventLink ? `
      <div class="cta-box">
        <p>Evento adicionado ao seu Google Calendar</p>
        <a href="${params.googleEventLink}" class="cta-btn">Ver no Google Calendar →</a>
      </div>` : ''}
    </div>
  `)

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'CRM Agenda'}" <${process.env.SMTP_USER}>`,
    to: params.to,
    subject: `📅 Visita agendada — ${params.leadNome} — ${data}`,
    html,
  })
}

// ── E-mail para o Lead/Cliente ─────────────────────────────────

export async function sendConfirmacaoLead(params: {
  to: string
  leadNome: string
  corretorNome: string
  imovelNome?: string
  dataHoraInicio: string
  dataHoraFim: string
  observacoes?: string
}) {
  const { data, hora } = formatDateTime(params.dataHoraInicio)
  const { hora: horaFim } = formatDateTime(params.dataHoraFim)

  const html = baseHtml(`
    <div class="header">
      <div class="header-icon">🏠</div>
      <h1>Sua Visita foi Agendada!</h1>
      <div style="margin-top:10px;"><span class="badge">✓ Confirmado</span></div>
    </div>
    <div class="body">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
        Olá, <strong style="color:#f1f5f9;">${params.leadNome}</strong>! Sua visita foi agendada com sucesso. Confira os detalhes abaixo.
      </p>
      <div class="info-row">
        <div class="info-icon">📆</div>
        <div>
          <div class="info-label">Data</div>
          <div class="info-value">${data}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-icon">🕐</div>
        <div>
          <div class="info-label">Horário</div>
          <div class="info-value">${hora} às ${horaFim}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-icon">👤</div>
        <div>
          <div class="info-label">Seu Corretor</div>
          <div class="info-value">${params.corretorNome}</div>
        </div>
      </div>
      ${params.imovelNome ? `
      <div class="info-row">
        <div class="info-icon">🏠</div>
        <div>
          <div class="info-label">Imóvel</div>
          <div class="info-value">${params.imovelNome}</div>
        </div>
      </div>` : ''}
      ${params.observacoes ? `
      <div class="info-row">
        <div class="info-icon">📝</div>
        <div>
          <div class="info-label">Observações</div>
          <div class="info-value" style="font-size:13px;font-weight:400;">${params.observacoes}</div>
        </div>
      </div>` : ''}
      <div class="cta-box">
        <p>Em caso de dúvidas ou necessidade de reagendamento, entre em contato com seu corretor.</p>
      </div>
    </div>
  `)

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'Agenda de Visitas'}" <${process.env.SMTP_USER}>`,
    to: params.to,
    subject: `🏠 Visita agendada para ${data} às ${hora}`,
    html,
  })
}
