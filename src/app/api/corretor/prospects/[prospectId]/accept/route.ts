import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { getPublicTokenFromRequest } from '@/lib/auth/jwt-public'

export const runtime = 'nodejs'

async function getLoggedUserId(request: NextRequest): Promise<string | null> {
  const token = getPublicTokenFromRequest(request)  // ✅ Use public helper
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

    // ATUALIZAÇÃO DO IMÓVEL (Regra de Negócio: Corretor que aceita assume o imóvel)
    try {
      await pool.query(`
        UPDATE imoveis i
        SET corretor_fk = $1::uuid,
            updated_at = NOW()
        FROM imovel_prospects ip
        WHERE ip.id = $2
          AND ip.id_imovel = i.id
      `, [userId, prospectId]);
      console.log(`[AcceptRoute] 🏠 Imóvel vinculado ao corretor ${userId}`);
    } catch (updateErr) {
      console.error('Erro ao vincular corretor ao imóvel após aceite:', updateErr);
    }


    // BUSCAR DADOS PARA ENVIO DE E-MAIL (Corretor + Imóvel + Proprietário + Cliente)
    try {
      // 1. Dados do Corretor (Quem aceitou)
      const corretorRes = await pool.query('SELECT nome, telefone, email, creci, foto FROM users WHERE id = $1', [userId]);
      const corretor = corretorRes.rows[0];

      // Helpers
      const formatCurrency = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return '-'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
      }
      const yn = (v: any) => (v === true ? 'Sim' : v === false ? 'Não' : '-')
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
        let clean = text.replace(/\\r\\n/g, '<br>').replace(/\\n/g, '<br>')
        clean = clean.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>')
        return clean
      }
      const joinParts = (parts: Array<any>) => parts.map((x) => String(x || '').trim()).filter(Boolean).join(', ')

      const getAppBaseUrl = () => {
        const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
        let url = fromEnv ? fromEnv.replace(/\/+$/, '') : 'http://localhost:3000'
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url
        return url
      }

      if (corretor) {
        // 2. Dados Completos (Imóvel, Proprietário, Cliente, Tipos)
        const dataRes = await pool.query(`
          SELECT 
            i.id as imovel_id, i.codigo, i.titulo, i.descricao, i.preco, i.preco_condominio, i.preco_iptu, i.taxa_extra,
            i.area_total, i.area_construida, i.quartos, i.banheiros, i.suites, i.vagas_garagem,
            i.varanda, i.andar, i.total_andares, i.mobiliado, i.aceita_permuta, i.aceita_financiamento,
            i.endereco, i.numero, i.complemento, i.bairro, i.cidade_fk, i.estado_fk, i.cep,
            i.latitude, i.longitude,
            ti.nome as tipo_nome, fi.nome as finalidade_nome, si.nome as status_nome,
            pr.nome as proprietario_nome, pr.cpf as proprietario_cpf, pr.telefone as proprietario_telefone,
            pr.email as proprietario_email, pr.endereco as proprietario_endereco, pr.numero as proprietario_numero,
            pr.complemento as proprietario_complemento, pr.bairro as proprietario_bairro,
            pr.cidade_fk as proprietario_cidade, pr.estado_fk as proprietario_estado, pr.cep as proprietario_cep,
            c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,
            ip.created_at as data_interesse, ip.preferencia_contato, ip.mensagem
          FROM imovel_prospects ip
          INNER JOIN imoveis i ON ip.id_imovel = i.id
          LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
          LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
          LEFT JOIN status_imovel si ON i.status_fk = si.id
          LEFT JOIN proprietarios pr ON pr.uuid = i.proprietario_uuid
          LEFT JOIN clientes c ON ip.id_cliente = c.uuid
          WHERE ip.id = $1
        `, [prospectId]);

        const p = dataRes.rows[0];

        if (p) {
          const { default: emailService } = await import('@/services/emailService');
          const baseActionUrl = getAppBaseUrl();

          const imovelEnderecoCompleto = joinParts([
            p.endereco, p.numero ? `nº ${p.numero}` : '', p.complemento,
            p.bairro, p.cidade_fk, p.estado_fk, p.cep ? `CEP: ${p.cep}` : ''
          ]);

          const proprietarioEnderecoCompleto = joinParts([
            p.proprietario_endereco, p.proprietario_numero ? `nº ${p.proprietario_numero}` : '',
            p.proprietario_complemento, p.proprietario_bairro, p.proprietario_cidade,
            p.proprietario_estado, p.proprietario_cep ? `CEP: ${p.proprietario_cep}` : ''
          ]);

          // URL Builders
          const painelUrl = `${baseActionUrl}/corretor/entrar?next=${encodeURIComponent(`/corretor/leads?prospectId=${prospectId}`)}`;
          const negocioFechadoUrl = `${baseActionUrl}/corretor/entrar?next=${encodeURIComponent(`/corretor/leads?prospectId=${prospectId}&openNegocioId=${p.imovel_id}`)}`;

          // 1. ENVIO PARA O CORRETOR (DADOS COMPLETOS)
          if (corretor.email) {
            console.log('📧 Enviando dados completos do lead para o corretor:', corretor.email);
            await emailService.sendTemplateEmail('novo-lead-corretor', corretor.email, {
              corretor_nome: corretor.nome || 'Corretor',
              aceite_msg: '(ACEITO)', // Indica aceite no assunto
              instruction_msg: '', // Já foi aceito
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
              area_total: p.area_total !== null ? `${p.area_total} m²` : '-',
              area_construida: p.area_construida !== null ? `${p.area_construida} m²` : '-',
              quartos: toStr(p.quartos),
              banheiros: toStr(p.banheiros),
              suites: toStr(p.suites),
              vagas_garagem: toStr(p.vagas_garagem),
              varanda: toStr(p.varanda),
              andar: toStr(p.andar),
              total_andares: toStr(p.total_andares),
              mobiliado: yn(p.mobiliado),
              aceita_permuta: yn(p.aceita_permuta),
              aceita_financiamento: yn(p.aceita_financiamento),
              endereco_completo: imovelEnderecoCompleto || '-',
              latitude: toStr(p.latitude),
              longitude: toStr(p.longitude),
              proprietario_nome: toStr(p.proprietario_nome),
              proprietario_cpf: toStr(p.proprietario_cpf),
              proprietario_telefone: toStr(p.proprietario_telefone),
              proprietario_email: toStr(p.proprietario_email),
              proprietario_endereco_completo: proprietarioEnderecoCompleto || '-',
              cliente_nome: toStr(p.cliente_nome),
              cliente_telefone: toStr(p.cliente_telefone),
              cliente_email: toStr(p.cliente_email),
              data_interesse: formatDateTime(p.data_interesse),
              preferencia_contato: toStr(p.preferencia_contato || 'Não informado'),
              mensagem: formatMultiLine(p.mensagem || 'Sem mensagem'),
              painel_url: painelUrl,
              negocio_fechado_url: negocioFechadoUrl
            });
          }

          // 2. ENVIO PARA O PROPRIETÁRIO
          if (p.proprietario_email) {
            console.log('📧 Notificando proprietário:', p.proprietario_email);
            await emailService.sendTemplateEmail('lead_accepted_owner_notification', p.proprietario_email, {
              proprietario_nome: p.proprietario_nome || 'Proprietário',
              imovel_titulo: p.titulo || 'Imóvel',
              imovel_codigo: p.codigo || '-',
              corretor_nome: corretor.nome || 'N/A',
              corretor_telefone: corretor.telefone || 'N/A',
              corretor_email: corretor.email || 'N/A',
              corretor_creci: corretor.creci || 'N/A',
              year: new Date().getFullYear().toString()
            }, corretor.foto ? [{ filename: 'broker.jpg', content: corretor.foto, cid: 'broker_photo' }] : []);
          }

          // 3. ENVIO PARA O CLIENTE (INFORMANDO O CORRETOR)
          if (p.cliente_email) {
            console.log('📧 Notificando cliente sobre o corretor:', p.cliente_email);
            await emailService.sendTemplateEmail('lead_accepted_client_notification', p.cliente_email, {
              cliente_nome: p.cliente_nome || 'Cliente',
              imovel_titulo: p.titulo || 'Imóvel',
              imovel_codigo: p.codigo || '-',
              cidade_estado: `${toStr(p.cidade_fk)} / ${toStr(p.estado_fk)}`,
              preco: formatCurrency(p.preco),
              corretor_nome: corretor.nome || 'Corretor',
              corretor_telefone: corretor.telefone || corretor.email || 'N/A',
              corretor_email: corretor.email || '',
              corretor_creci: corretor.creci || '-',
              endereco_completo: imovelEnderecoCompleto || '-',
              area_total: p.area_total !== null ? `${p.area_total} m²` : '-',
              quartos: toStr(p.quartos),
              suites: toStr(p.suites),
              vagas_garagem: toStr(p.vagas_garagem),
              year: new Date().getFullYear().toString()
            }, corretor.foto ? [{ filename: 'broker.jpg', content: corretor.foto, cid: 'broker_photo' }] : []);
          }
        }
      }
    } catch (emailErr) {
      console.error('❌ Erro no fluxo de e-mails de aceite:', emailErr);
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (e) {
    console.error('Erro ao aceitar lead:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


