import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { DistributionEngine } from '@/lib/routing/distributionEngine'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('accessToken')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

/**
 * CRM LEAD STAGING API (Fase 1)
 * Endpoint para ingestão de leads brutos vindo de APIs, Webhooks e Formulários.
 * Implementa Match Engine básico (Email e Telefone).
 */

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { nome, email, telefone, tag_sonho, raw_json, utm_params, imovel_id } = data
    // ID real de campanhasmarketingdigital."Campaign" — só vem preenchido quando o lead se
    // origina de uma campanha lançada por esta plataforma (resolveCtaRef via Ad.trackingId).
    // Mecanismos externos/formulário/orgânico continuam sem esse valor — ver
    // docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.
    const campaignId: string | null = data.campaign_id || null

    // Aceita UTMs tanto como objeto aninhado (utm_params) quanto como campos flat (utm_source, etc.)
    const resolvedUtmParams = utm_params ?? (data.utm_source ? {
      source:   data.utm_source,
      medium:   data.utm_medium   ?? null,
      campaign: data.utm_campaign ?? null,
      content:  data.utm_content  ?? null,
      fbclid:   data.fbclid       ?? null,
      gclid:    data.gclid        ?? null,
      platform: data.origem       ?? data.plataforma ?? 'cta',
    } : null)

    if (!email && !telefone && data.utm_source !== 'CRM Manual') {
      return NextResponse.json(
        { error: 'Email ou Telefone são obrigatórios para identificação do lead.' },
        { status: 400 }
      )
    }

    // Normalizar strings vazias para null para evitar falso-positivo no Match Engine
    const strEmail = email && email.trim() !== '' ? email.trim() : null;
    const strTelefone = telefone && telefone.trim() !== '' ? telefone.trim() : null;

    // --- LÓGICA DE HERANÇA GEOGRÁFICA E TENANT ---
    let inheritedEstado = data.estado_fk || null
    let inheritedCidade = data.cidade_fk || null
    let leadTenantId = data.tenant_id || '00000000-0000-0000-0000-000000000001'
    const leadClientId = data.client_id || null  // segmento/cliente (multi-tenant); null = "own"

    if (imovel_id) {
      const propertyRes = await pool.query(
        'SELECT estado_fk, cidade_fk, tenant_id FROM imoveis WHERE id = $1',
        [imovel_id]
      )
      if (propertyRes.rows.length > 0) {
        inheritedEstado = inheritedEstado || propertyRes.rows[0].estado_fk
        inheritedCidade = inheritedCidade || propertyRes.rows[0].cidade_fk
        leadTenantId = data.tenant_id || propertyRes.rows[0].tenant_id
      }
    }

    // 1. MATCH ENGINE (F4 — docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §6): buscar se o lead já
    // existe na Staging (dentro do mesmo tenant). Telefone é comparado NORMALIZADO (só dígitos,
    // últimos 10) em vez de string exata — canais diferentes (WhatsApp/CRM manual/Lead Ads)
    // gravam o mesmo número em formatos diferentes ("(81) 99800-0047" vs "+5581998000047"),
    // e comparação exata deixava a mesma pessoa virar 2 leads (bug real confirmado em produção
    // antes desta correção). Email tem prioridade sobre telefone por ser identificador mais
    // estável; match_method registra qual critério bateu, para auditoria/rastreabilidade (I1).
    const existingLeadQuery = `
      SELECT lead_uuid, status,
        CASE
          WHEN email IS NOT NULL AND email = $1::text THEN 'email'
          ELSE 'telefone'
        END AS match_method
      FROM leads_staging
      WHERE tenant_id = $3::uuid
        AND (
          (email IS NOT NULL AND email = $1::text)
          OR (
            telefone IS NOT NULL AND $2::text IS NOT NULL
            AND RIGHT(regexp_replace(telefone, '\\D', '', 'g'), 10) = RIGHT(regexp_replace($2::text, '\\D', '', 'g'), 10)
          )
        )
      ORDER BY (email IS NOT NULL AND email = $1::text) DESC, created_at DESC
      LIMIT 1
    `
    const { rows: existingRows } = await pool.query(existingLeadQuery, [strEmail, strTelefone, leadTenantId])
    let leadUuid: string
    const matchMethod: string = existingRows[0]?.match_method || 'novo'

    // Se o lead entra pelo CRM Manual, permite gerar MÚLTIPLOS CARDS para o mesmo cliente
    const isManual = data.utm_source === 'CRM Manual';
    const shouldCreateNew = isManual || existingRows.length === 0;

    if (!shouldCreateNew) {
      // Lead já existe e veio automático -> UPDATE (Enriquecer e mesclar via Match Engine)
      leadUuid = existingRows[0].lead_uuid
      const updateQuery = `
        UPDATE leads_staging
        SET
          nome = COALESCE($1, nome),
          tag_sonho = COALESCE($2, tag_sonho),
          imovel_id = COALESCE($3, imovel_id),
          estado_fk = COALESCE($4, estado_fk),
          cidade_fk = COALESCE($5, cidade_fk),
          raw_json = COALESCE(raw_json || $6::jsonb, $6::jsonb),
          match_method = $8,
          updated_at = NOW()
        WHERE lead_uuid = $7
        RETURNING lead_uuid
      `
      await pool.query(updateQuery, [
        nome,
        tag_sonho,
        imovel_id,
        inheritedEstado,
        inheritedCidade,
        JSON.stringify(raw_json || {}),
        leadUuid,
        matchMethod
      ])
    } else {
      // Lead NOVO -> INSERT
      const insertQuery = `
        INSERT INTO leads_staging (nome, email, telefone, tag_sonho, raw_json, imovel_id, estado_fk, cidade_fk, utm_campaign, valor_venda, tenant_id, client_id, match_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING lead_uuid
      `
      const { rows: insertRows } = await pool.query(insertQuery, [
        nome,
        strEmail,
        strTelefone,
        tag_sonho || 'A Definir',
        JSON.stringify(raw_json || {}),
        imovel_id,
        inheritedEstado,
        inheritedCidade,
        data.utm_campaign || null,
        data.valor_venda || 0,
        leadTenantId,
        leadClientId,
        isManual ? 'manual' : 'novo'
      ])
      leadUuid = insertRows[0].lead_uuid

      // Criar entrada inicial no Kanban (Agnóstico à nomenclatura de colunas, mas específico do tenant)
      await pool.query(
        'INSERT INTO leads_kanban (lead_uuid, coluna_id, tenant_id, client_id) VALUES ($1, (SELECT id FROM kanban_colunas WHERE ativa = true AND tenant_id = $2 ORDER BY ordem ASC LIMIT 1), $2, $3)',
        [leadUuid, leadTenantId, leadClientId]
      )
    }

    // 2. ATRIBUIÇÃO DE MARKETING (Se houver UTMs)
    if (resolvedUtmParams) {
      const marketingQuery = `
        INSERT INTO marketing_eventos (
          lead_uuid, utm_source, utm_medium, utm_campaign, utm_content,
          fbclid, gclid, plataforma, tenant_id, client_id, campaign_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
      await pool.query(marketingQuery, [
        leadUuid,
        resolvedUtmParams.source,
        resolvedUtmParams.medium,
        resolvedUtmParams.campaign,
        resolvedUtmParams.content,
        resolvedUtmParams.fbclid,
        resolvedUtmParams.gclid,
        resolvedUtmParams.platform || 'cta',
        leadTenantId,
        leadClientId,
        campaignId
      ])
    }

    // 3. MOTOR DE QUALIFICAÇÃO CONCIERGE IA (NOVO - FASE 3)
    const { ConciergeService } = await import('@/lib/ai/conciergeService')
    const qualification = await ConciergeService.qualifyLead(data.mensagem || '', 1, leadTenantId, raw_json)

    await pool.query(
      `UPDATE leads_staging 
       SET tag_sonho = COALESCE($1, tag_sonho),
           resumo_ia = $2,
           score_prontidao = $3
       WHERE lead_uuid = $4`,
      [qualification.tag_sonho, qualification.resumo_ia, qualification.score_prontidao * 10, leadUuid]
    )

    // 4. MOTOR DE DISTRIBUIÇÃO INTELIGENTE (NOVO)
    // Buscamos o dono do imóvel para passar ao motor (Nível 1)
    let sourceOwnerId = null
    if (imovel_id) {
       const ownerRes = await pool.query('SELECT corretor_fk FROM imoveis WHERE id = $1', [imovel_id])
       sourceOwnerId = ownerRes.rows[0]?.corretor_fk
    }

    const routed = await DistributionEngine.findBestCandidate({
       lead_id: leadUuid,
       target_id: imovel_id,
       source_owner_id: sourceOwnerId,
       estado_fk: inheritedEstado,
       cidade_fk: inheritedCidade,
       domain_id: 1, // Imobiliário
       tenant_id: leadTenantId
    })

    if (routed) {
       console.log(`[StagingAPI] Lead ${leadUuid} atribuído ao corretor ${routed.nome} via ${routed.motivo_atribuicao}`)
       
        await pool.query(
          `UPDATE leads_staging 
           SET corretor_atribuido_id = $1, 
               atribuido_em = NOW(),
               atribuicao_expira_em = $2
           WHERE lead_uuid = $3`,
          [routed.id, routed.motivo_atribuicao === 'dono_ativo' || routed.is_plantonista ? null : routed.expira_em, leadUuid]
        )

        // LOG DE HISTÓRICO PARA EXCLUSÃO EM TRANSBORDOS FUTUROS
        await pool.query(
          `INSERT INTO leads_staging_atribuicoes (lead_uuid, corretor_id, status)
           VALUES ($1, $2, $3)`,
          [leadUuid, routed.id, 'atribuido']
        )

       // Se o lead foi aceito automaticamente (Dono ou Plantonista), podemos mover de coluna
       if (routed.motivo_atribuicao === 'dono_ativo' || routed.is_plantonista) {
          await pool.query(
            `UPDATE leads_kanban 
             SET coluna_id = (SELECT id FROM kanban_colunas WHERE nome = 'entendimento_dor' AND tenant_id = $2 LIMIT 1)
             WHERE lead_uuid = $1`,
            [leadUuid, leadTenantId]
          )

        // 5. ATUALIZAR SCORE (Gamificação - Fase 3)
        const isAutoAccepted = (routed.motivo_atribuicao === 'dono_ativo' || routed.is_plantonista)
        await pool.query(
          `INSERT INTO corretor_scores (user_id, leads_recebidos, leads_aceitos) 
           VALUES ($1, 1, $2)
           ON CONFLICT (user_id) DO UPDATE 
           SET leads_recebidos = corretor_scores.leads_recebidos + 1,
               leads_aceitos = corretor_scores.leads_aceitos + $2,
               updated_at = NOW()`,
          [routed.id, isAutoAccepted ? 1 : 0]
        )
       }
    }

    // --- 🚀 NOVO: MOTOR DE ENRIQUECIMENTO GLOBAL (CRM AGNÓSTICO) ---
    // Mesmo sem imovel_id o EnrichmentService é acionado para renderizar as tags de Captações Genéricas automaticamente
    const { EnrichmentService } = await import('@/lib/crm/enrichmentService');
    await EnrichmentService.enrichLead(leadUuid, 1, imovel_id); // Domínio 1 = Imobiliário

    return NextResponse.json({
      success: true,
      lead_uuid: leadUuid,
      message: existingRows.length > 0 ? 'Lead enriquecido com sucesso.' : 'Novo lead captado e registrado.'
    })

  } catch (error: any) {
    console.error('ERRO CRM STAGING API:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar lead.', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * LISTAR LEADS DA STAGING (Fase 1)
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    const query = `
      SELECT l.lead_uuid, l.nome, l.email, l.telefone, l.status, l.score_prontidao, l.tag_sonho, l.resumo_ia,
             l.imovel_id, l.estado_fk, l.cidade_fk, l.created_at, l.enriquecimento_cache,
             k.nome as coluna_nome 
      FROM leads_staging l
      LEFT JOIN leads_kanban lk ON l.lead_uuid = lk.lead_uuid
      LEFT JOIN kanban_colunas k ON lk.coluna_id = k.id
      ${!isMaster ? 'WHERE l.tenant_id = $1' : ''}
      ORDER BY l.created_at DESC
      LIMIT 100
    `
    const { rows } = !isMaster 
      ? await pool.query(query, [tenantId]) 
      : await pool.query(query)
      
    return NextResponse.json({ success: true, leads: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
