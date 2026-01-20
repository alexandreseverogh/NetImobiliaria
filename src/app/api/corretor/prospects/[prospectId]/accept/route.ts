import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

export const runtime = 'nodejs'

async function getLoggedUserId(request: NextRequest): Promise<string | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null
  try {
    const decoded: any = await verifyToken(token)
    return decoded?.userId || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: { prospectId: string } }) {
  try {
    const userId = await getLoggedUserId(request)
    if (!userId) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const prospectId = Number(params.prospectId)
    if (!prospectId) return NextResponse.json({ success: false, error: 'Prospect inválido' }, { status: 400 })

    const pool = (await import('@/lib/database/connection')).default
    const q = `
      UPDATE public.imovel_prospect_atribuicoes
      SET status = 'aceito',
          data_aceite = NOW()
      WHERE prospect_id = $1
        AND corretor_fk = $2::uuid
        AND status = 'atribuido'
        AND (expira_em IS NULL OR expira_em > NOW())
      RETURNING id, prospect_id, status, data_aceite as aceito_em, created_at
    `
    const res = await pool.query(q, [prospectId, userId])
    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead não encontrado, já aceito ou SLA expirado' },
        { status: 400 }
      )
    }

    // Gamification: Registrar Aceite
    try {
      const { GamificationService } = await import('@/lib/gamification/gamificationService')
      const row = res.rows[0]
      const ca = new Date(row.created_at)
      const aa = new Date(row.aceito_em)
      const diffSeconds = Math.floor((aa.getTime() - ca.getTime()) / 1000)

      // Executar em background (sem await) para não travar resposta
      GamificationService.recordLeadAcceptance(userId, diffSeconds).catch(err => {
        console.error('Erro ao registrar XP de gamificação:', err)
      })
    } catch (gError) {
      console.error('Erro ao carregar serviço de gamificação:', gError)
    }

    // ATUALIZAÇÃO DO IMÓVEL (Regra de Negócio: Se imóvel sem corretor, quem aceita assume)
    try {
      await pool.query(`
        UPDATE imoveis i
        SET corretor_fk = $1::uuid
        FROM imovel_prospects ip
        WHERE ip.id = $2
          AND ip.id_imovel = i.id
          AND i.corretor_fk IS NULL
      `, [userId, prospectId]);
    } catch (updateErr) {
      console.error('Erro ao vincular corretor ao imóvel após aceite:', updateErr);
    }


    // BUSCAR DADOS PARA ENVIO DE E-MAIL (Corretor + Imóvel + Proprietário)
    try {
      // 1. Dados do Corretor (Quem aceitou)
      const corretorRes = await pool.query('SELECT nome, telefone, email, creci, foto FROM users WHERE id = $1', [userId]);
      const corretor = corretorRes.rows[0];

      // Helpers
      const formatCurrency = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return '-'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
      }
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
      const joinParts = (parts: Array<any>) => parts.map((x) => String(x || '').trim()).filter(Boolean).join(', ')

      if (corretor) {
        // 2. Dados do Imóvel e Proprietário (Enriquecido)
        const imovelOwnerRes = await pool.query(`
          SELECT 
            i.titulo as imovel_titulo,
            i.codigo as imovel_codigo,
            i.preco,
            i.endereco, i.numero, i.complemento, i.bairro, i.cidade_fk, i.estado_fk, i.cep,
            i.area_total, i.quartos, i.suites, i.vagas_garagem,
            p.nome as proprietario_nome,
            p.email as proprietario_email,
            p.telefone as proprietario_telefone,
            p.cpf as proprietario_cpf,
            p.endereco as proprietario_endereco,
            ip.created_at as data_interesse,
            ip.preferencia_contato,
            ip.mensagem
          FROM imovel_prospects ip
          INNER JOIN imoveis i ON ip.id_imovel = i.id
          INNER JOIN proprietarios p ON i.proprietario_fk = p.id
          WHERE ip.id = $1
        `, [prospectId]);

        const dadosImovelOwner = imovelOwnerRes.rows[0];

        if (dadosImovelOwner && dadosImovelOwner.proprietario_email) {
          console.log('📧 Preparando envio de e-mail para proprietário:', dadosImovelOwner.proprietario_email);

          const { default: emailService } = await import('@/services/emailService');

          await emailService.sendTemplateEmail(
            'lead_accepted_owner_notification',
            dadosImovelOwner.proprietario_email,
            {
              proprietario_nome: dadosImovelOwner.proprietario_nome || 'Proprietário',
              imovel_titulo: dadosImovelOwner.imovel_titulo || 'Imóvel',
              imovel_codigo: dadosImovelOwner.imovel_codigo || '-',
              corretor_nome: corretor.nome || 'N/A',
              corretor_telefone: corretor.telefone || 'N/A',
              corretor_email: corretor.email || 'N/A',
              corretor_creci: corretor.creci || 'N/A',
              year: new Date().getFullYear().toString()
            },
            corretor.foto ? [{
              filename: 'broker.jpg',
              content: corretor.foto, // Buffer do banco
              cid: 'broker_photo' // Referenciado no template HTML
            }] : []
          );
        } else {
          console.warn('⚠️ Dados de proprietário ou e-mail não encontrados para notificação.');
        }

        // ===========================================
        // ENVIO DE E-MAIL PARA O CLIENTE (LEAD)
        // ===========================================
        // Join: imovel_prospects -> clientes
        const prospectClienteRes = await pool.query(`
          SELECT 
            c.nome as cliente_nome,
            c.email as cliente_email
          FROM imovel_prospects ip
          LEFT JOIN clientes c ON ip.id_cliente = c.uuid
          WHERE ip.id = $1
        `, [prospectId]);
        const dadosCliente = prospectClienteRes.rows[0];

        if (dadosCliente && dadosCliente.cliente_email) {
          console.log('📧 Preparando envio de e-mail para CLIENTE:', dadosCliente.cliente_email);
          const { default: emailService } = await import('@/services/emailService');

          // Previsão de dados para payload enriquecido
          const p = dadosImovelOwner || {};
          const imovelEnderecoCompleto = joinParts([
            p.endereco,
            p.numero ? `nº ${p.numero}` : '',
            p.complemento,
            p.bairro,
            p.cidade_fk,
            p.estado_fk,
            p.cep ? `CEP: ${p.cep}` : ''
          ])

          await emailService.sendTemplateEmail(
            'lead_accepted_client_notification',
            dadosCliente.cliente_email,
            {
              cliente_nome: dadosCliente.cliente_nome || 'Cliente',
              imovel_titulo: p.imovel_titulo || 'Imóvel',
              imovel_codigo: p.imovel_codigo || '-',
              corretor_nome: corretor.nome || 'Corretor', // Já tem nome real
              corretor_telefone: corretor.telefone || corretor.email || 'N/A',
              corretor_email: corretor.email || '',
              corretor_creci: corretor.creci || '-',
              year: new Date().getFullYear().toString(),
              // Dados Enriquecidos
              preco: formatCurrency(p.preco),
              endereco_completo: imovelEnderecoCompleto || '-',
              cidade_estado: `${toStr(p.cidade_fk)} / ${toStr(p.estado_fk)}`,
              area_total: p.area_total !== null ? `${p.area_total} m²` : '-',
              quartos: toStr(p.quartos),
              suites: toStr(p.suites),
              vagas_garagem: toStr(p.vagas_garagem),

              proprietario_nome: toStr(p.proprietario_nome),
              proprietario_cpf: toStr(p.proprietario_cpf),
              proprietario_telefone: toStr(p.proprietario_telefone),
              proprietario_email: toStr(p.proprietario_email),
              proprietario_endereco: toStr(p.proprietario_endereco),

              data_interesse: formatDateTime(p.data_interesse),
              preferencia_contato: toStr(p.preferencia_contato),
              mensagem: toStr(p.mensagem)
            },
            corretor.foto ? [{
              filename: 'broker.jpg',
              content: corretor.foto,
              cid: 'broker_photo'
            }] : []
          );
        }
      }
    } catch (emailErr) {
      console.error('❌ Erro ao enviar e-mail de notificação para proprietário:', emailErr);
      // Não falhar o request principal
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (e) {
    console.error('Erro ao aceitar lead:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


