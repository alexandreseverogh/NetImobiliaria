import pool from '@/lib/database/connection'
import emailService from '@/services/emailService'
import { DistributionEngine } from './distributionEngine'
import fs from 'fs'
import path from 'path'

function debugLog(msg: string) {
  try {
    const logPath = path.join(process.cwd(), 'routing_debug.txt')
    const time = new Date().toISOString()
    fs.appendFileSync(logPath, `[${time}] ${msg}\n`)
  } catch (e) { }
}

// Tipos mantidos para compatibilidade com as notificações existentes
type RoutedBroker = {
  id: string
  nome: string
  email: string
  motivo: any
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

  // --- NOVO MOTOR UNIFICADO (Refatoração para Reuso SaaS/Multi-Domínio) ---
  const result = await DistributionEngine.findBestCandidate({
    lead_id: prospectId,
    target_id: p.imovel_id,
    source_owner_id: p.corretor_fk, // Dono da captação
    estado_fk: estado,
    cidade_fk: cidade,
    domain_id: 1 // Imobiliário
  }, excludeIds, runner);

  if (!result) {
    debugLog(`Failed: No candidate found by DistributionEngine`)
    return { success: false, reason: 'Nenhum corretor disponível pelos critérios de roteamento' }
  }

  const broker = {
    id: result.id,
    nome: result.nome,
    email: result.email,
    motivo: { type: result.motivo_atribuicao, engine: 'v2' }
  }
  
  const slaMinutos = result.sla_minutos;
  const expiraEm = result.expira_em;
  const motivoType = result.motivo_atribuicao; // Crucial para os templates de email abaixo
  const isAutoAceite = result.motivo_atribuicao === 'dono_ativo' || result.is_plantonista;

  let status: 'atribuido' | 'aceito' = isAutoAceite ? 'aceito' : 'atribuido';
  let finalExpiraEm = isAutoAceite ? null : expiraEm;

  if (status === 'aceito') {
      try {
        await runner.query(`
          UPDATE imoveis i
          SET corretor_fk = $1::uuid,
              updated_at = NOW()
          FROM imovel_prospects ip
          WHERE ip.id = $2
            AND ip.id_imovel = i.id
        `, [broker.id, prospectId]);
        console.log(`[routeProspectAndNotify] 🏠 Imóvel vinculado ao corretor ${broker.nome} (Auto-Aceite)`);
      } catch (errAssign) {
        console.error('[routeProspectAndNotify] Erro ao vincular corretor ao imóvel:', errAssign);
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
      [prospectId, broker.id, status, JSON.stringify(broker.motivo || {}), finalExpiraEm]
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


