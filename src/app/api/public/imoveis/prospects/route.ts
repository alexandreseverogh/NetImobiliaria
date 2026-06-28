import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import emailService from '@/services/emailService'
import { routeProspectAndNotify } from '@/lib/routing/prospectRouter'
import jwt from 'jsonwebtoken'

/**
 * GET /api/public/imoveis/prospects?imovelId=123
 * Busca o registro de interesse (imovel_prospects) do cliente logado para um imóvel.
 * Usado para pré-preencher o modal "Tenho Interesse" e evitar duplicidade.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imovelIdParam = searchParams.get('imovelId')
    const clienteUuidParam = searchParams.get('cliente_uuid')

    // CENÁRIO 1: Buscar prospect específico (imovelId)
    // Usado para pré-preencher o modal "Tenho Interesse" e evitar duplicidade.
    if (imovelIdParam) {
      const imovelId = Number(imovelIdParam)
      if (!Number.isFinite(imovelId) || imovelId <= 0) {
        return NextResponse.json({ success: false, message: 'ID do imóvel inválido' }, { status: 400 })
      }

      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
      if (!token) {
        return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 })
      }

      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
      const decoded: any = jwt.verify(token, jwtSecret)
      const clienteUuid = String(decoded?.userUuid || '')
      const userType = String(decoded?.userType || '')

      if (!clienteUuid || userType !== 'cliente') {
        return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 })
      }

      const q = `
        SELECT id, id_cliente, id_imovel, preferencia_contato, mensagem, created_at
        FROM imovel_prospects
        WHERE id_cliente = $1 AND id_imovel = $2
        LIMIT 1
      `
      const res = await pool.query(q, [clienteUuid, imovelId])
      const prospect = res.rows?.[0] || null
      return NextResponse.json({ success: true, data: { prospect } })
    }

    // CENÁRIO 2: Listar prospects de um cliente (cliente_uuid)
    // Lista imóveis que um cliente demonstrou interesse
    else if (clienteUuidParam) {
      // 🚨 GUARDIAN RULE: Security Check
      // Validar se o token corresponde ao cliente solicitado
      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

      if (!token) {
        return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 })
      }

      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
      const decoded: any = jwt.verify(token, jwtSecret)
      const tokenClienteUuid = String(decoded?.userUuid || '')
      const userType = String(decoded?.userType || '')

      if (userType !== 'cliente' || tokenClienteUuid !== clienteUuidParam) {
        return NextResponse.json({ success: false, message: 'Acesso negado: Você só pode ver seus próprios interesses.' }, { status: 403 })
      }

      const result = await pool.query(
        `SELECT 
          ip.id,
          ip.id_cliente,
          ip.id_imovel,
          ip.created_at,
          i.titulo,
          i.codigo,
          i.preco,
          i.preco_condominio as condominio,
          i.preco_iptu as iptu,
          i.taxa_extra,
          i.area_total,
          i.quartos,
          i.suites,
          i.banheiros,
          i.vagas_garagem,
          i.varanda,
          i.andar,
          i.total_andares,
          i.endereco,
          i.numero,
          i.complemento,
          i.bairro,
          i.cidade_fk,
          i.estado_fk,
          i.cep,
          fi.nome as finalidade,
          u.nome as corretor_nome,
          u.email as corretor_email,
          u.telefone as corretor_telefone
        FROM imovel_prospects ip
        INNER JOIN imoveis i ON ip.id_imovel = i.id
        LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        LEFT JOIN users u ON i.corretor_fk = u.id
        WHERE ip.id_cliente = $1 AND i.ativo = true
        ORDER BY ip.created_at DESC`,
        [clienteUuidParam]
      )

      return NextResponse.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      })
    }

    // CENÁRIO 3: Parâmetros inválidos
    else {
      return NextResponse.json(
        { success: false, message: 'Parâmetros inválidos. Informe imovelId (busca única) ou cliente_uuid (listagem).' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    const msg = String(error?.message || '')
    if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('token')) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 })
    }
    console.error('❌ Erro na rota prospects:', error)
    return NextResponse.json({ success: false, message: 'Erro interno', error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/public/imoveis/prospects
 * Registra interesse de um cliente em um imóvel (prospect)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [DEBUG] RECEBENDO INTERESSE EM IMÓVEL - ROTA ACIONADA');
    const body = await request.json()
    const { imovelId, clienteUuid, preferenciaContato, mensagem } = body

    // Se houver token público, ele é a fonte de verdade para o cliente logado.
    let clienteUuidFromToken: string | null = null
    try {
      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
      if (token) {
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
        const decoded: any = jwt.verify(token, jwtSecret)
        if (decoded?.userType === 'cliente' && decoded?.userUuid) {
          clienteUuidFromToken = String(decoded.userUuid)
        }
      }
    } catch {
      // Se token inválido, segue fluxo antigo (compatibilidade). Não bloquear aqui.
      clienteUuidFromToken = null
    }
    const effectiveClienteUuid = clienteUuidFromToken || clienteUuid

    // Validações
    if (!imovelId || !effectiveClienteUuid) {
      return NextResponse.json(
        { success: false, message: 'ID do imóvel e UUID do cliente são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o cliente existe
    const clienteCheck = await pool.query(
      'SELECT uuid FROM clientes WHERE uuid = $1',
      [effectiveClienteUuid]
    )

    if (clienteCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o imóvel existe
    const imovelCheck = await pool.query(
      'SELECT id FROM imoveis WHERE id = $1 AND ativo = true',
      [imovelId]
    )

    if (imovelCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Imóvel não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Verificar se já existe registro (há constraint UNIQUE em id_cliente+id_imovel)
    // Regra de negócio (UX): mesmo que já exista, podemos reenviar o e-mail de interesse,
    // atualizando mensagem/preferência, sem criar duplicata.
    const existingCheck = await pool.query(
      'SELECT id, created_at FROM imovel_prospects WHERE id_cliente = $1 AND id_imovel = $2',
      [effectiveClienteUuid, imovelId]
    )

    let prospectId: number | null = null
    let alreadyExists = false

    if (existingCheck.rows.length > 0) {
      alreadyExists = true
      prospectId = Number(existingCheck.rows[0]?.id)

      // Atualizar preferencia/mensagem e "tocar" o timestamp para refletir novo clique do usuário.
      // Não roteamos novamente aqui para evitar duplicidade de atribuições/SLA.
      try {
        await pool.query(
          `
          UPDATE imovel_prospects
          SET
            preferencia_contato = COALESCE($1, preferencia_contato),
            mensagem = COALESCE($2, mensagem),
            created_at = NOW()
          WHERE id = $3
          `,
          [preferenciaContato || null, mensagem || null, prospectId]
        )
      } catch (e) {
        console.warn('⚠️ Não foi possível atualizar dados do prospect existente (não bloqueia):', e)
      }
    } else {
      // Buscar o tenant_id do imóvel para associar ao prospect
      const imovelTenantRes = await pool.query('SELECT tenant_id FROM imoveis WHERE id = $1', [imovelId])
      const imovelTenantId = imovelTenantRes.rows[0]?.tenant_id || '00000000-0000-0000-0000-000000000001'

      // Inserir novo registro
      const result = await pool.query(
        `INSERT INTO imovel_prospects (id_cliente, id_imovel, created_by, preferencia_contato, mensagem, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         RETURNING id, id_cliente, id_imovel, created_at, tenant_id`,
        [effectiveClienteUuid, imovelId, effectiveClienteUuid, preferenciaContato || null, mensagem || null, imovelTenantId]
      )
      prospectId = Number(result.rows[0]?.id)

      // Disparar roteamento do lead para corretor (não bloquear o fluxo se falhar)
      try {
        if (prospectId) {
          // MVP: executar inline com catch (sem fila).
          await routeProspectAndNotify(prospectId);

          // --- UNIFICAÇÃO: ESPELHAR PARA leads_staging PARA O DASHBOARD ---
          // Vamos buscar os dados que já foram carregados no imovelDataQuery (que tem Cliente e Imóvel juntos)
          // Nota: movi esta lógica para logo após a definição de 'imovel' no bloco de e-mail por segurança.
        }
      } catch (routerError) {
        console.error('⚠️ Falha ao rotear lead:', routerError)
      }
    }

    // 1. ESPELHAMENTO DE LEAD (Staging) - INDEPENDENTE E GARANTIDO
    try {
      const syncDataQuery = await pool.query(
        `SELECT 
              i.codigo, i.titulo, i.cidade_fk, i.estado_fk, i.tenant_id,
              c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,
              ip.mensagem
             FROM imovel_prospects ip
             INNER JOIN imoveis i ON ip.id_imovel = i.id
             INNER JOIN clientes c ON ip.id_cliente = c.uuid
             WHERE ip.id = $1`,
        [prospectId]
      );

      if (syncDataQuery.rows.length > 0) {
        const row = syncDataQuery.rows[0];

        // --- QUALIFICAÇÃO CONCIERGE IA ---
        let aiSummary = null;
        let aiScore = 0;
        try {
          const { ConciergeService } = await import('@/lib/ai/conciergeService');
          const qualification = await ConciergeService.qualifyLead(row.mensagem || '', 1, row.tenant_id, { source: 'site_prospect', imovel_id: imovelId });
          aiSummary = qualification.resumo_ia;
          aiScore = Math.floor(qualification.score_prontidao * 10);
        } catch (aiErr) {
          console.warn('⚠️ [ProspectSync] IA falhou, seguindo com score 0:', aiErr);
        }

        // INSERIR OU ATUALIZAR NA STAGING (E PEGAR O UUID PARA ENRIQUECER)
        const stgRes = await pool.query(
          `INSERT INTO leads_staging (nome, email, telefone, imovel_id, raw_json, status, estado_fk, cidade_fk, tag_sonho, resumo_ia, score_prontidao, tenant_id)
           VALUES ($1, $2, $3, $4, $5, 'lead_captado', $6, $7, $8, $9, $10, $11)
           ON CONFLICT (email, imovel_id) 
           DO UPDATE SET updated_at = NOW(), score_prontidao = EXCLUDED.score_prontidao
           RETURNING lead_uuid`,
          [
            row.cliente_nome, 
            row.cliente_email, 
            row.cliente_telefone, 
            imovelId, 
            JSON.stringify({ source: 'site_landpaging', prospect_id: prospectId, message: row.mensagem }), 
            row.estado_fk, 
            row.cidade_fk,
            'Interesse em Imóvel',
            aiSummary,
            aiScore,
            row.tenant_id
          ]
        );
        
        const leadUuid = stgRes.rows[0]?.lead_uuid;

        // --- 🚀 NOVO: ENTRADA NO KANBAN (REGRA: PRIMEIRA COLUNA) ---
        if (leadUuid) {
           await pool.query(
             'INSERT INTO leads_kanban (lead_uuid, coluna_id, tenant_id) VALUES ($1, (SELECT id FROM kanban_colunas WHERE nome = $2 AND tenant_id = $3 LIMIT 1), $3) ON CONFLICT (lead_uuid) DO NOTHING',
             [leadUuid, 'lead_captado', row.tenant_id]
           );
        }

        // --- 🚀 NOVO: MOTOR DE ENRIQUECIMENTO GLOBAL (CRM AGNÓSTICO) ---
        if (leadUuid) {
           const { EnrichmentService } = await import('@/lib/crm/enrichmentService');
           await EnrichmentService.enrichLead(leadUuid, 1, imovelId); // Domínio 1 = Imobiliário
           console.log(`✅ [ProspectSync] Lead ${row.cliente_email} captado e enriquecido via metadados.`);
        }
      } else {
        console.warn(`⚠️ [ProspectSync] Nenhuma linha encontrada para o prospect ID ${prospectId} para realizar a sincronização.`);
      }
    } catch (stgErr: any) {
      console.error('❌ [ProspectSync] ERRO CRÍTICO NA GRAVAÇÃO:', stgErr.message);
    }

    // 2. BUSCAR DADOS PARA E-MAIL (COM JOINS COMPLEXOS)
    const imovelDataQuery = await pool.query(
      `SELECT 
            i.codigo, i.titulo, i.preco, i.preco_condominio as condominio, i.preco_iptu as iptu,
            i.taxa_extra, i.area_total, i.quartos, i.suites, i.banheiros, i.vagas_garagem,
            i.varanda, i.andar, i.total_andares, i.endereco, i.numero, i.complemento,
            i.bairro, i.cidade_fk, i.estado_fk, i.cep,
            fi.nome as finalidade,
            c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,
            ip.created_at as data_interesse, ip.preferencia_contato, ip.mensagem,
            pr.nome as proprietario_nome, pr.telefone as proprietario_telefone,
            pr.email as proprietario_email, pr.cpf as proprietario_cpf,
            pr.endereco as proprietario_endereco
           FROM imovel_prospects ip
           INNER JOIN imoveis i ON ip.id_imovel = i.id
           LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
           INNER JOIN clientes c ON ip.id_cliente = c.uuid
           LEFT JOIN proprietarios pr ON i.proprietario_uuid = pr.uuid
           WHERE ip.id = $1`,
      [prospectId]
    )

    // Enviar e-mail de notificação (não bloquear o fluxo se falhar)
    if (imovelDataQuery.rows.length > 0) {
      try {
        const imovel = imovelDataQuery.rows[0]

        // Formatar valores monetários
        const formatCurrency = (value: number | null | undefined): string => {
          if (value === null || value === undefined) return '-'
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(value)
        }

        // Formatar data
        const formatDate = (date: string | Date | null | undefined): string => {
          if (!date) return '-'
          try {
            const d = new Date(date)
            if (isNaN(d.getTime())) return '-'
            const day = String(d.getDate()).padStart(2, '0')
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const year = d.getFullYear()
            return `${day}/${month}/${year}`
          } catch {
            return '-'
          }
        }

        // Montar endereço completo
        const enderecoCompleto = [
          imovel.endereco,
          imovel.numero && `nº ${imovel.numero}`,
          imovel.complemento,
          imovel.bairro,
          imovel.cidade_fk,
          imovel.estado_fk,
          imovel.cep && `CEP: ${imovel.cep}`
        ].filter(Boolean).join(', ')

        const toStr = (v: any) => v ? String(v).trim() : '-'

        // Preparar variáveis para o template
        const emailVariables: Record<string, string> = {
          codigo: imovel.codigo || '-',
          estado: imovel.estado_fk || '-',
          cidade: imovel.cidade_fk || '-',
          finalidade: imovel.finalidade || '-',
          preco: formatCurrency(imovel.preco),
          condominio: formatCurrency(imovel.condominio),
          iptu: formatCurrency(imovel.iptu),
          taxa_extra: formatCurrency(imovel.taxa_extra),
          area_total: imovel.area_total ? `${imovel.area_total} m²` : '-',
          quartos: imovel.quartos?.toString() || '-',
          suites: imovel.suites?.toString() || '-',
          banheiros: imovel.banheiros?.toString() || '-',
          garagens: imovel.vagas_garagem?.toString() || '-',
          varanda: imovel.varanda?.toString() || '0',
          andar: imovel.andar?.toString() || '-',
          total_andares: imovel.total_andares?.toString() || '-',
          endereco_completo: enderecoCompleto || 'Endereço não informado',

          // Proprietário
          proprietario_nome: toStr(imovel.proprietario_nome),
          proprietario_telefone: toStr(imovel.proprietario_telefone),
          proprietario_email: toStr(imovel.proprietario_email),
          proprietario_cpf: toStr(imovel.proprietario_cpf),
          proprietario_endereco_completo: toStr(imovel.proprietario_endereco),

          cliente_nome: imovel.cliente_nome || '-',
          cliente_email: imovel.cliente_email || '-',
          cliente_telefone: imovel.cliente_telefone || '-',
          data_interesse: formatDate(imovel.data_interesse),
          preferencia_contato: imovel.preferencia_contato
            ? (imovel.preferencia_contato === 'telefone' ? 'Telefone'
              : imovel.preferencia_contato === 'email' ? 'Email'
                : imovel.preferencia_contato === 'whatsapp' ? 'WhatsApp'
                  : imovel.preferencia_contato === 'ambos' ? 'Telefone e Email'
                    : imovel.preferencia_contato)
            : 'Não informado',
          mensagem: imovel.mensagem || 'Nenhuma mensagem foi enviada pelo cliente.'
        }

        // Enviar e-mail para alexandreseverog@gmail.com
        await emailService.initialize()
        const emailSent = await emailService.sendTemplateEmail(
          'imovel-interesse',
          'alexandreseverog@gmail.com',
          emailVariables
        )

        if (emailSent) {
          console.log('✅ E-mail de interesse em imóvel enviado com sucesso')
        } else {
          console.warn('⚠️ Falha ao enviar e-mail de interesse em imóvel (não bloqueia o registro)')
        }
      } catch (emailError: any) {
        // Não bloquear o registro se o e-mail falhar
        console.error('❌ Erro ao enviar e-mail de interesse em imóvel:', emailError)
        console.error('⚠️ Registro de interesse foi salvo, mas e-mail não foi enviado')
      }
    }

    return NextResponse.json({
      success: true,
      message: alreadyExists ? 'Interesse atualizado e notificação reenviada' : 'Interesse registrado com sucesso',
      alreadyExists,
      data: { id: prospectId, id_cliente: effectiveClienteUuid, id_imovel: imovelId }
    })

  } catch (error: any) {
    console.error('❌ Erro ao registrar interesse:', error)
    console.error('❌ Stack:', error.stack)
    console.error('❌ Detalhes:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    })
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao registrar interesse',
        error: error.message,
        details: error.detail || error.hint || 'Verifique se a tabela imovel_prospects existe'
      },
      { status: 500 }
    )
  }
}



