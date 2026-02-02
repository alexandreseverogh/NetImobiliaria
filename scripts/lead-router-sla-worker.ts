/**
 * Lead Router SLA Worker (TypeScript + Guardian)
 * 
 * Monitors and processes lead assignments based on SLA (Service Level Agreement):
 * - Expires assignments that exceed their SLA time
 * - Routes leads through tier hierarchy: External → Internal → Plantonista
 * - Uses LeadGuardian for all business logic decisions (NO HARDCODING)
 * - Sends email notifications for all state changes
 * 
 * Run: npx tsx scripts/lead-router-sla-worker.ts
 */

import dotenv from 'dotenv';
import cron from 'node-cron';
import { Pool, PoolClient } from 'pg';
import nodemailer from 'nodemailer';
import { LeadGuardian } from '../src/lib/guardian/LeadGuardian';
import { fetchGuardianConfig, fetchAssignmentHistory } from '../src/lib/guardian/config';
import type { BrokerTier, Assignment } from '../src/lib/guardian/types';

dotenv.config({ path: '.env.local' });

// Database connection (porta 15432 conforme solicitado)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432', 10),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

console.log(`🔌 [LeadWorker] DB Setup: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '15432'}`);

// Global flag to prevent overlapping executions
let isProcessing = false;

// ============================================================================
// TYPES
// ============================================================================

interface Broker {
    id: string;
    nome: string;
    email: string;
}

interface LeadPayload {
    prospect_id: number;
    id_imovel: number;
    corretor_fk?: string;
    estado_fk: string;
    cidade_fk: string;
    codigo: string;
    titulo: string;
    descricao?: string;
    tipo_nome?: string;
    finalidade_nome?: string;
    status_nome?: string;
    preco?: number;
    preco_condominio?: number;
    preco_iptu?: number;
    taxa_extra?: number;
    area_total?: number;
    area_construida?: number;
    quartos?: number;
    banheiros?: number;
    suites?: number;
    vagas_garagem?: number;
    varanda?: number;
    andar?: number;
    total_andares?: number;
    mobiliado?: boolean;
    aceita_permuta?: boolean;
    aceita_financiamento?: boolean;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    latitude?: number;
    longitude?: number;
    proprietario_nome?: string;
    proprietario_cpf?: string;
    proprietario_telefone?: string;
    proprietario_email?: string;
    proprietario_endereco?: string;
    proprietario_numero?: string;
    proprietario_complemento?: string;
    proprietario_bairro?: string;
    proprietario_cidade?: string;
    proprietario_estado?: string;
    proprietario_cep?: string;
    cliente_nome?: string;
    cliente_email?: string;
    cliente_telefone?: string;
    data_interesse?: Date;
    preferencia_contato?: string;
    mensagem?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function appBaseUrl(): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    return base.replace(/\/+$/, '');
}

function buildCorretorPainelUrl(prospectId: number): string {
    const base = appBaseUrl();
    const next = `/corretor/leads?prospectId=${encodeURIComponent(String(prospectId))}`;
    return `${base}/corretor/entrar?next=${encodeURIComponent(next)}`;
}

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function yn(v: any): string {
    return v === true ? 'Sim' : v === false ? 'Não' : '-';
}

function toStr(v: any): string {
    if (v === null || v === undefined) return '-';
    const s = String(v).trim();
    return s ? s : '-';
}

function formatDateTime(value: any): string {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
}

function formatMultiLine(text: string): string {
    if (!text) return '-';
    let clean = text.replace(/\\r\\n/g, '<br>').replace(/\\n/g, '<br>');
    clean = clean.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
    return clean;
}

function joinParts(parts: Array<any>): string {
    return parts.map((x) => String(x || '').trim()).filter(Boolean).join(', ');
}

// ============================================================================
// DATABASE QUERIES
// ============================================================================

async function getUserById(userId: string): Promise<Broker | null> {
    const r = await pool.query('SELECT id, nome, email FROM public.users WHERE id = $1::uuid LIMIT 1', [userId]);
    return r.rows?.[0] || null;
}

async function getLeadPayload(prospectId: number): Promise<LeadPayload | null> {
    const q = `
    SELECT
      ip.id as prospect_id,
      ip.created_at as data_interesse,
      ip.preferencia_contato,
      ip.mensagem,
      i.id as id_imovel,
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
    FROM public.imovel_prospects ip
    INNER JOIN public.imoveis i ON ip.id_imovel = i.id
    LEFT JOIN public.tipos_imovel ti ON i.tipo_fk = ti.id
    LEFT JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
    LEFT JOIN public.status_imovel si ON i.status_fk = si.id
    LEFT JOIN public.proprietarios pr ON pr.uuid = i.proprietario_uuid
    INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
    WHERE ip.id = $1
  `;
    const r = await pool.query(q, [prospectId]);
    return r.rows?.[0] || null;
}

async function pickNextBrokerByAreaExternal(estado: string, cidade: string, prospectId: number): Promise<Broker | null> {
    const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp,
      COUNT(a2.id) AS total_recebidos,
      MAX(a2.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND u.id NOT IN (
        SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
      )
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a2.id) ASC, 
      MAX(a2.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 1
  `;
    const r = await pool.query(q, [estado, cidade, prospectId]);
    return r.rows?.[0] || null;
}

async function pickInternalBrokerByArea(estado: string, cidade: string, prospectId: number): Promise<Broker | null> {
    const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp,
      COUNT(a2.id) AS total_recebidos,
      MAX(a2.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND COALESCE(u.tipo_corretor, 'Externo') = 'Interno'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND u.id NOT IN (
        SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
      )
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a2.id) ASC, 
      MAX(a2.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 1
  `;
    const r = await pool.query(q, [estado, cidade, prospectId]);
    return r.rows?.[0] || null;
}

async function pickPlantonistaBroker(estado?: string, cidade?: string): Promise<Broker | null> {
    // Try area match first if location provided
    if (estado && cidade) {
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
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = true
        AND COALESCE(u.tipo_corretor, 'Interno') = 'Interno'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
      GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
      ORDER BY 
        COALESCE(cs.nivel, 0) DESC,
        COALESCE(cs.xp_total, 0) DESC,
        COUNT(a.id) ASC, 
        MAX(a.created_at) ASC NULLS FIRST, 
        u.created_at ASC
      LIMIT 1
    `;
        const rLocal = await pool.query(qLocal, [estado, cidade]);
        if (rLocal.rows.length > 0) return rLocal.rows[0];
    }

    // Fallback: any plantonista
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
      AND COALESCE(u.tipo_corretor, 'Interno') = 'Interno'
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 1
  `;
    const rGlobal = await pool.query(qGlobal);
    return rGlobal.rows?.[0] || null;
}

// ============================================================================
// EMAIL FUNCTIONS (preserved from original)
// ============================================================================

async function getEmailConfig() {
    const r = await pool.query('SELECT * FROM public.email_settings WHERE is_active = true LIMIT 1');
    if (!r.rows.length) throw new Error('Nenhuma configuração de email ativa (email_settings)');
    return r.rows[0];
}

async function getEmailTemplate(name: string) {
    const r = await pool.query('SELECT * FROM public.email_templates WHERE is_active = true AND name = $1 LIMIT 1', [name]);
    if (!r.rows.length) throw new Error(`Template '${name}' não encontrado/ativo`);
    return r.rows[0];
}

function applyVars(text: string, vars: Record<string, string>): string {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, String(value || ''));
    }
    return result;
}

async function logEmailSend(templateName: string, to: string, success: boolean, errorMsg: string | null) {
    try {
        await pool.query(
            `INSERT INTO public.email_logs (template_name, recipient, success, error_message, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
            [templateName, to, success, errorMsg]
        );
    } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao registrar log de email:', e);
    }
}

async function isEmailBouncedRecently(email: string, minutes: number): Promise<boolean> {
    try {
        const r = await pool.query(
            `SELECT 1 FROM public.email_bounces 
       WHERE email = $1 AND bounced_at >= NOW() - INTERVAL '${minutes} minutes' LIMIT 1`,
            [email]
        );
        return r.rows.length > 0;
    } catch {
        return false;
    }
}

async function markEmailBounce(email: string, reason: string) {
    try {
        await pool.query(
            `INSERT INTO public.email_bounces (email, reason, bounced_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET reason = $2, bounced_at = NOW()`,
            [email, reason]
        );
    } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao marcar bounce:', e);
    }
}

async function sendTemplateEmail(to: string, templateName: string, variables: Record<string, string>): Promise<boolean> {
    const settings = await getEmailConfig();
    const template = await getEmailTemplate(templateName);

    const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: Number(settings.smtp_port || 587),
        secure: !!settings.smtp_secure,
        auth: settings.smtp_username
            ? { user: settings.smtp_username, pass: settings.smtp_password }
            : undefined
    });

    const subject = applyVars(template.subject, variables);
    const html = applyVars(template.html_content, variables);
    const text = applyVars(template.text_content, variables);

    try {
        const bounced = await isEmailBouncedRecently(to, 180);
        if (bounced) {
            console.warn(`⚠️ [LeadWorker] Email bloqueado (bounce recente): ${to} (template=${templateName})`);
            await logEmailSend(templateName, to, false, 'Bloqueado: bounce recente');
            return false;
        }

        const info = await transporter.sendMail({
            from: `"${settings.from_name || 'Net Imobiliária'}" <${settings.from_email || 'noreply@localhost'}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '')
        });

        await logEmailSend(templateName, to, true, null);
        console.log(`📧 [LeadWorker] Email enviado (${templateName}) para ${to} (${info?.messageId || 'sem messageId'})`);
        return true;
    } catch (e: any) {
        const msg = e?.message || String(e);
        await logEmailSend(templateName, to, false, msg);
        await markEmailBounce(to, msg);
        console.warn(`⚠️ [LeadWorker] Falha ao enviar email (${templateName}) para ${to}:`, msg);
        return false;
    }
}

async function logAudit(action: string, table: string, recordId: any, metadata: any) {
    try {
        await pool.query(
            `INSERT INTO public.audit_logs (action, table_name, record_id, metadata, created_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())`,
            [action, table, recordId, JSON.stringify(metadata)]
        );
    } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao registrar auditoria:', e);
    }
}

// ============================================================================
// MAIN PROCESSING LOGIC (with Guardian integration)
// ============================================================================

async function processExpiredOnce(): Promise<number> {
    console.log('🔍 [LeadWorker] Buscando leads expirados...');

    // Guardian: Fetch configuration (NO HARDCODING)
    const guardianConfig = await fetchGuardianConfig(pool);
    const guardian = new LeadGuardian(guardianConfig);

    // Normalize: fixed assignments (imovel_corretor_fk) should never expire
    try {
        await pool.query(`
      UPDATE public.imovel_prospect_atribuicoes
      SET expira_em = NULL
      WHERE status = 'atribuido'
        AND expira_em IS NOT NULL
        AND COALESCE(motivo->>'type','') = 'imovel_corretor_fk'
    `);
    } catch (e: any) {
        console.warn('⚠️ [LeadWorker] Falha ao normalizar expira_em para imovel_corretor_fk:', e?.message || e);
    }

    const expired = await pool.query(`
    SELECT id, prospect_id, corretor_fk
    FROM public.imovel_prospect_atribuicoes
    WHERE status = 'atribuido'
      AND expira_em IS NOT NULL
      AND expira_em <= NOW()
      AND COALESCE(motivo->>'type','') <> 'imovel_corretor_fk'
    ORDER BY expira_em ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  `);

    if (!expired.rows.length) return 0;

    let processed = 0;

    for (const row of expired.rows) {
        const assignmentId = row.id;
        const prospectId = row.prospect_id;
        const prevBrokerId = row.corretor_fk;

        try {
            console.log(`💡 [LeadWorker] Processando lead ${prospectId} (AssignmentId: ${assignmentId})`);
            await pool.query('BEGIN');

            // Mark as expired
            const upd = await pool.query(
                `UPDATE public.imovel_prospect_atribuicoes
         SET status = 'expirado', updated_at = NOW()
         WHERE id = $1 AND status = 'atribuido'
         RETURNING prospect_id`,
                [assignmentId]
            );

            if (!upd.rows.length) {
                await pool.query('ROLLBACK');
                continue;
            }

            await logAudit('UPDATE', 'imovel_prospect_atribuicoes', assignmentId, {
                event: 'SLA_EXPIRED',
                prospect_id: prospectId,
                assignment_id: assignmentId,
                previous_corretor_fk: prevBrokerId
            });

            const payload = await getLeadPayload(prospectId);
            if (!payload) {
                await pool.query('COMMIT');
                processed++;
                continue;
            }

            const estado = String(payload.estado_fk || '').trim();
            const cidade = String(payload.cidade_fk || '').trim();

            // Guardian: Fetch assignment history and determine next tier
            const history = await fetchAssignmentHistory(prospectId, pool);
            const tierDecision = guardian.getNextTier(history);

            console.log(`📊 [LeadWorker] Lead ${prospectId}: Guardian Decision - Tier=${tierDecision.tier}, Reason=${tierDecision.reason}`);

            // Pick broker based on Guardian's tier decision
            let broker: Broker | null = null;
            let motivo: any = null;

            if (tierDecision.tier === 'External') {
                broker = await pickNextBrokerByAreaExternal(estado, cidade, prospectId);
                if (broker) {
                    motivo = {
                        type: 'area_match',
                        source: 'sla_transbordo',
                        previous_corretor_fk: prevBrokerId,
                        guardian_decision: tierDecision.reason
                    };
                } else {
                    // Fallback to Internal if no External available
                    broker = await pickInternalBrokerByArea(estado, cidade, prospectId);
                    if (broker) {
                        motivo = {
                            type: 'area_match_internal',
                            source: 'sla_transbordo_fallback',
                            previous_corretor_fk: prevBrokerId,
                            guardian_decision: 'External unavailable, fallback to Internal'
                        };
                    }
                }
            } else if (tierDecision.tier === 'Internal') {
                broker = await pickInternalBrokerByArea(estado, cidade, prospectId);
                if (broker) {
                    motivo = {
                        type: 'area_match_internal',
                        source: 'sla_transbordo',
                        previous_corretor_fk: prevBrokerId,
                        guardian_decision: tierDecision.reason
                    };
                }
            }

            // Fallback to Plantonista if no broker found
            if (!broker) {
                broker = await pickPlantonistaBroker(estado, cidade);
                if (broker) {
                    motivo = {
                        type: 'fallback_plantonista',
                        source: 'sla_transbordo',
                        previous_corretor_fk: prevBrokerId,
                        guardian_decision: tierDecision.tier === 'Plantonista'
                            ? tierDecision.reason
                            : 'No brokers available in target tier'
                    };
                }
            }

            if (!broker) {
                console.warn(`⚠️ [LeadWorker] Nenhum corretor disponível para lead ${prospectId}`);
                await pool.query('COMMIT');
                processed++;
                continue;
            }

            // Guardian: Calculate expiration and status
            const tier: BrokerTier = motivo.type === 'fallback_plantonista'
                ? 'Plantonista'
                : motivo.type === 'area_match_internal'
                    ? 'Internal'
                    : 'External';

            const expiraEm = guardian.calculateExpirationTime(tier, false);
            const assignmentStatus = guardian.determineAssignmentStatus(tier, false);
            // Guardian only returns 'atribuido' or 'aceito' for non-owner assignments
            const status = assignmentStatus as 'atribuido' | 'aceito';

            // Create new assignment
            await pool.query(
                `INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em, data_aceite)
         VALUES ($1, $2::uuid, $3, $4::jsonb, $5, CASE WHEN $3 = 'aceito' THEN NOW() ELSE NULL END)`,
                [prospectId, broker.id, status, JSON.stringify(motivo), expiraEm]
            );

            // If auto-accepted (Plantonista), update property owner
            if (status === 'aceito') {
                await pool.query(
                    'UPDATE public.imoveis SET corretor_fk = $1::uuid, updated_at = NOW() WHERE id = $2',
                    [broker.id, payload.id_imovel]
                );
                console.log(`🏠 [LeadWorker] Imóvel ${payload.id_imovel} vinculado ao corretor ${broker.id} (Auto-Aceite)`);
            }

            await pool.query('COMMIT');

            // Send emails (preserved from original logic)
            await sendEmailNotifications(broker, payload, prevBrokerId, status, guardianConfig);

            processed++;
        } catch (e: any) {
            await pool.query('ROLLBACK');
            console.error(`❌ [LeadWorker] Erro ao processar lead ${prospectId}:`, e?.message || e);
        }
    }

    return processed;
}

async function sendEmailNotifications(
    broker: Broker,
    payload: LeadPayload,
    prevBrokerId: string,
    status: 'atribuido' | 'aceito',
    guardianConfig: any
) {
    const painelUrl = buildCorretorPainelUrl(payload.prospect_id);
    const imovelEnderecoCompleto = joinParts([
        payload.endereco,
        payload.numero ? `nº ${payload.numero}` : '',
        payload.complemento,
        payload.bairro,
        payload.cidade_fk,
        payload.estado_fk,
        payload.cep ? `CEP: ${payload.cep}` : ''
    ]);

    // Email to new broker
    try {
        const templateName = status === 'aceito' ? 'novo-lead-corretor-imovel-fk' : 'novo-lead-corretor';
        const aceiteMsg = status === 'aceito' ? '' : '(aceite necessário)';
        const instructionMsg = status === 'aceito' ? '' : 'Para iniciar o atendimento, acesse o painel e <strong>aceite o lead</strong>.';

        await sendTemplateEmail(broker.email, templateName, {
            corretor_nome: broker.nome || 'Corretor',
            aceite_msg: aceiteMsg,
            instruction_msg: instructionMsg,
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
            area_total: payload.area_total ? `${payload.area_total} m²` : '-',
            area_construida: payload.area_construida ? `${payload.area_construida} m²` : '-',
            quartos: toStr(payload.quartos),
            banheiros: toStr(payload.banheiros),
            suites: toStr(payload.suites),
            vagas_garagem: toStr(payload.vagas_garagem),
            varanda: toStr(payload.varanda),
            andar: toStr(payload.andar),
            total_andares: toStr(payload.total_andares),
            mobiliado: yn(payload.mobiliado),
            aceita_permuta: yn(payload.aceita_permuta),
            aceita_financiamento: yn(payload.aceita_financiamento),
            endereco_completo: imovelEnderecoCompleto || '-',
            latitude: toStr(payload.latitude),
            longitude: toStr(payload.longitude),
            proprietario_nome: toStr(payload.proprietario_nome),
            proprietario_cpf: toStr(payload.proprietario_cpf),
            proprietario_telefone: toStr(payload.proprietario_telefone),
            proprietario_email: toStr(payload.proprietario_email),
            proprietario_endereco_completo: joinParts([
                payload.proprietario_endereco,
                payload.proprietario_numero ? `nº ${payload.proprietario_numero}` : '',
                payload.proprietario_complemento,
                payload.proprietario_bairro,
                payload.proprietario_cidade,
                payload.proprietario_estado,
                payload.proprietario_cep ? `CEP: ${payload.proprietario_cep}` : ''
            ]) || '-',
            cliente_nome: toStr(payload.cliente_nome),
            cliente_telefone: toStr(payload.cliente_telefone),
            cliente_email: toStr(payload.cliente_email),
            data_interesse: formatDateTime(payload.data_interesse),
            preferencia_contato: toStr(payload.preferencia_contato || 'Não informado'),
            mensagem: formatMultiLine(payload.mensagem || 'Sem mensagem'),
            painel_url: painelUrl
        });
    } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao enviar email para novo corretor:', e);
    }

    // Email to previous broker (lead lost)
    try {
        const prevUser = await getUserById(prevBrokerId);
        if (prevUser?.email) {
            await sendTemplateEmail(prevUser.email, 'lead-perdido-sla', {
                corretor_nome: prevUser.nome || 'Corretor',
                painel_url: painelUrl,
                sla_minutos: String(guardianConfig.sla_minutos_aceite_lead),
                tentativa_atual: '-',
                limite_tentativas: '-',
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
                area_total: payload.area_total ? `${payload.area_total} m²` : '-',
                area_construida: payload.area_construida ? `${payload.area_construida} m²` : '-',
                quartos: toStr(payload.quartos),
                banheiros: toStr(payload.banheiros),
                suites: toStr(payload.suites),
                vagas_garagem: toStr(payload.vagas_garagem),
                varanda: toStr(payload.varanda),
                andar: toStr(payload.andar),
                total_andares: toStr(payload.total_andares),
                aceita_permuta: yn(payload.aceita_permuta),
                aceita_financiamento: yn(payload.aceita_financiamento),
                endereco_completo: imovelEnderecoCompleto || '-'
            });
        }
    } catch (e) {
        console.warn('⚠️ [LeadWorker] Falha ao enviar email para corretor anterior (SLA expirado):', e);
    }

    // Email to client (if auto-accepted)
    if (status === 'aceito' && payload.cliente_email) {
        try {
            await sendTemplateEmail(payload.cliente_email, 'lead-aceito-cliente', {
                cliente_nome: payload.cliente_nome || 'Cliente',
                imovel_titulo: toStr(payload.titulo),
                imovel_codigo: toStr(payload.codigo),
                cidade_estado: `${toStr(payload.cidade_fk)} / ${toStr(payload.estado_fk)}`,
                preco: formatCurrency(payload.preco),
                corretor_nome: broker.nome || 'Corretor',
                corretor_telefone: broker.email || 'N/A',
                corretor_email: broker.email || '',
                corretor_creci: '-',
                endereco_completo: imovelEnderecoCompleto || '-',
                area_total: payload.area_total ? `${payload.area_total} m²` : '-',
                quartos: toStr(payload.quartos),
                suites: toStr(payload.suites),
                vagas_garagem: toStr(payload.vagas_garagem)
            });
        } catch (e) {
            console.warn('⚠️ [LeadWorker] Falha ao enviar email para cliente (Auto-Aceite):', e);
        }
    }
}

// ============================================================================
// CRON JOB
// ============================================================================

async function runWorker() {
    if (isProcessing) {
        console.log('⏭️  [LeadWorker] Execução anterior ainda em andamento, pulando...');
        return;
    }

    isProcessing = true;
    try {
        const processed = await processExpiredOnce();
        if (processed > 0) {
            console.log(`✅ [LeadWorker] Processados ${processed} leads expirados`);
        }
    } catch (e: any) {
        console.error('❌ [LeadWorker] Erro fatal:', e?.message || e);
    } finally {
        isProcessing = false;
    }
}

// Run every minute
cron.schedule('* * * * *', runWorker);

console.log('🚀 [LeadWorker] Worker iniciado (cron: a cada 1 minuto)');
console.log('🛡️  [LeadWorker] Guardian Rules ativado - Tier transitions: External → Internal → Plantonista');

// Run once on startup
runWorker();
