/**
 * GET/PUT /api/admin/dados-empresa/perfil
 *
 * Dados da PRÓPRIA empresa (tenant do token), editáveis pelo administrador do tenant.
 * Allowlist explícita: só os campos de EDITABLE_FIELDS podem ser gravados.
 *
 * Deliberadamente FORA desta rota (só o Master edita):
 *   - chaves de IA (anthropic_api_key, ai_config) e threshold de confiança do agente
 *   - domínio público (public_domain)
 *   - segmento (segment_id) e isenções de cobrança (isento_*)
 *   - integrações Stripe (têm rotas próprias)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions';
import { isAvatarTtlEnabled } from '@/lib/mensageria/avatarService';

export const dynamic = 'force-dynamic';

const RESOURCE = 'dados-empresa';

// Campo da API -> coluna em public.tenants
const EDITABLE_FIELDS: Record<string, string> = {
  razaoSocial:    'name',
  cnpjCpf:        'cnpj_cpf',
  emailContato:   'email_contato',
  telefone:       'telefone',
  logradouro:     'logradouro',
  numero:         'numero',
  complemento:    'complemento',
  bairro:         'bairro',
  cep:            'cep',
  cidade:         'cidade',
  estado:         'estado',
  primaryColor:   'primary_color',
  secondaryColor: 'secondary_color',
  // Comunicação (alertas)
  numeroWhatsapp: 'numero_whatsapp',
  whatsappAlerta: 'whatsapp_alerta',
  slackWebhookUrl:'slack_webhook_url',
  // Google Calendar
  calendario:     'calendario',
  googleEmail:    'google_email',
  duracaoVisita:  'duracao_visita',
  // Foto de contatos: dias até atualizar. Vazio = herda do segmento.
  avatarTtlDays:  'avatar_ttl_days',
  // Mídia de contato sem número: tempo máximo de download, em segundos (gravado em ms).
  lidMediaTimeoutSeconds: 'lid_media_timeout_ms',
  // Conexão Evolution da empresa. A CHAVE (evolution_api_key) não está aqui de propósito:
  // é só de escrita, tratada à parte no PUT, e nunca devolvida no GET.
  evolutionApiUrl:   'evolution_api_url',
  evolutionInstance: 'evolution_instance',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLACK_RE = /^https:\/\/hooks\.slack\.com\/services\/.+/;
// Logo é guardado como data URL (base64) em tenants.logo_url, mesmo formato do Master.
// Limite de 1 MB do arquivo original: base64 ocupa ~4/3 do tamanho, daí o teto de caracteres.
const LOGO_RE = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/;
const LOGO_MAX_CHARS = Math.ceil((1024 * 1024 * 4) / 3) + 64;

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const denied = await requireAnyApiPermission(request, [RESOURCE], 'READ');
  if (denied) return denied;

  const cols = [...Object.values(EDITABLE_FIELDS), 'logo_url', 'evolution_api_key'].join(', ');
  const { rows } = await pool.query(
    `SELECT ${cols} FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [payload.tenantId],
  );
  if (!rows[0]) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const out: Record<string, unknown> = {};
  for (const [apiKey, col] of Object.entries(EDITABLE_FIELDS)) {
    if (col === 'calendario') out[apiKey] = rows[0][col] === true;
    else if (col === 'duracao_visita') out[apiKey] = rows[0][col] ?? 60;
    else if (col === 'avatar_ttl_days') out[apiKey] = rows[0][col] ?? null;
    else if (col === 'lid_media_timeout_ms') out[apiKey] = Math.round(Number(rows[0][col] ?? 15000) / 1000);
    else out[apiKey] = rows[0][col] ?? '';
  }
  out.logo = rows[0].logo_url ?? '';
  // Só informa SE a chave existe. O valor nunca sai pela API.
  out.evolutionKeyConfigured = !!rows[0].evolution_api_key;
  out.avatarTtlEnabled = await isAvatarTtlEnabled(payload.tenantId);
  return NextResponse.json(out);
}

export async function PUT(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const denied = await requireAnyApiPermission(request, [RESOURCE], 'UPDATE');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  // Só os campos da allowlist entram no UPDATE; o resto é ignorado.
  const sets: string[] = [];
  const values: unknown[] = [];
  const invalid = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

  // TTL da foto só é gravado quando o tenant tem Mensageria + Gerar mensagens. Fora disso o campo
  // nem aparece na tela; se vier no corpo, é ignorado sem erro (não trava o salvamento do formulário).
  const avatarTtlEnabled = await isAvatarTtlEnabled(payload.tenantId);

  for (const [apiKey, col] of Object.entries(EDITABLE_FIELDS)) {
    if (!(apiKey in body)) continue;
    if (col === 'avatar_ttl_days' && !avatarTtlEnabled) continue;
    const raw = body[apiKey];
    let value: unknown;

    if (col === 'calendario') {
      if (typeof raw !== 'boolean') return invalid('Valor inválido para o calendário');
      value = raw;
    } else if (col === 'duracao_visita') {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 15 || n > 480) return invalid('Duração deve estar entre 15 e 480 minutos');
      value = n;
    } else if (col === 'lid_media_timeout_ms') {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 120) return invalid('Tempo de download da mídia deve estar entre 1 e 120 segundos');
      value = n * 1000;
    } else if (col === 'avatar_ttl_days') {
      // Vazio = null = herda do segmento. Preenchido: inteiro de 1 a 365 dias.
      if (raw == null || raw === '') {
        value = null;
      } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > 365) return invalid('Atualização da foto deve estar entre 1 e 365 dias');
        value = n;
      }
    } else {
      const s = raw == null ? '' : String(raw).trim();
      if (s && col === 'email_contato' && !EMAIL_RE.test(s)) return invalid('E-mail de notificações inválido');
      if (s && col === 'google_email' && !EMAIL_RE.test(s)) return invalid('E-mail Google inválido');
      if (s && (col === 'primary_color' || col === 'secondary_color') && !HEX_RE.test(s)) return invalid('Cor deve estar no formato #RRGGBB');
      if (s && col === 'slack_webhook_url' && !SLACK_RE.test(s)) return invalid('Webhook do Slack deve começar com https://hooks.slack.com/services/');
      if (s && col === 'numero_whatsapp' && !/^\d{10,13}$/.test(s)) return invalid('Número de WhatsApp deve conter apenas dígitos, com DDD (10 a 13 dígitos)');
      if (s && col === 'whatsapp_alerta' && !/^\d{10,13}$/.test(s)) return invalid('Número para alertas deve conter apenas dígitos, com DDD (10 a 13 dígitos)');
      if (s && col === 'evolution_api_url' && !/^https?:\/\/[^\s]+$/i.test(s)) return invalid('URL da Evolution deve começar com http:// ou https://');
      if (s && col === 'evolution_instance' && !/^[A-Za-z0-9_-]{2,60}$/.test(s)) return invalid('Nome da instância deve ter de 2 a 60 letras, números, _ ou -');
      value = s || null;
    }
    values.push(value);
    sets.push(`${col} = $${values.length}`);
  }

  // Logo: 'logo' ausente = não mexe; string vazia ou null = remove; data URL válida = grava.
  if ('logo' in body) {
    const raw = body.logo;
    if (raw == null || raw === '') {
      values.push(null);
      sets.push(`logo_url = $${values.length}`);
    } else if (typeof raw === 'string' && LOGO_RE.test(raw)) {
      if (raw.length > LOGO_MAX_CHARS) return invalid('O logo é muito grande. O limite é 1 MB.');
      values.push(raw);
      sets.push(`logo_url = $${values.length}`);
    } else {
      return invalid('Logo deve ser PNG, JPG, WEBP ou SVG');
    }
  }

  // Chave da Evolution: só de escrita. Vazia ou ausente = mantém a atual (não apaga por engano).
  // Para trocar, envie o novo valor; não há como ler o atual de volta.
  if ('evolutionApiKey' in body) {
    const k = body.evolutionApiKey == null ? '' : String(body.evolutionApiKey).trim();
    if (k) {
      if (k.length > 200 || /\s/.test(k)) return invalid('Chave da Evolution inválida');
      values.push(k);
      sets.push(`evolution_api_key = $${values.length}`);
    }
  }

  if (sets.length === 0) return invalid('Nenhum campo válido enviado');

  values.push(payload.tenantId);
  await pool.query(
    `UPDATE public.tenants SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}::uuid`,
    values,
  );
  return NextResponse.json({ success: true });
}
