import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import emailService from '@/services/emailService'
import { routeProspectAndNotify } from '@/lib/routing/prospectRouter'

/**
 * POST /api/public/imoveis/prospects
 * Registra interesse de um cliente em um imóvel (prospect)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imovelId, clienteUuid, preferenciaContato, mensagem } = body

    // Validações
    if (!imovelId || !clienteUuid) {
      return NextResponse.json(
        { success: false, message: 'ID do imóvel e UUID do cliente são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o cliente existe
    const clienteCheck = await pool.query(
      'SELECT uuid FROM clientes WHERE uuid = $1',
      [clienteUuid]
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

    // Verificar se já existe registro (evitar duplicatas)
    const existingCheck = await pool.query(
      'SELECT id FROM imovel_prospects WHERE id_cliente = $1 AND id_imovel = $2',
      [clienteUuid, imovelId]
    )

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        { success: true, message: 'Interesse já registrado anteriormente', alreadyExists: true },
        { status: 200 }
      )
    }

    // Inserir novo registro
    const result = await pool.query(
      `INSERT INTO imovel_prospects (id_cliente, id_imovel, created_by, preferencia_contato, mensagem, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, id_cliente, id_imovel, created_at`,
      [clienteUuid, imovelId, clienteUuid, preferenciaContato || null, mensagem || null]
    )

    // Disparar roteamento do lead para corretor (não bloquear o fluxo se falhar)
    try {
      const prospectId = Number(result.rows[0]?.id)
      if (prospectId) {
        // MVP: executar inline com catch (sem fila). Evoluir para job/queue quando WhatsApp entrar.
        await routeProspectAndNotify(prospectId)
      }
    } catch (routerError) {
      console.error('⚠️ Falha ao rotear lead para corretor (não bloqueia o registro):', routerError)
    }

    // Buscar dados completos do imóvel e cliente para enviar e-mail
    const imovelDataQuery = await pool.query(
      `SELECT 
        i.codigo,
        i.titulo,
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
        c.nome as cliente_nome,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        ip.created_at as data_interesse,
        ip.preferencia_contato,
        ip.mensagem
       FROM imovel_prospects ip
       INNER JOIN imoveis i ON ip.id_imovel = i.id
       LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
       INNER JOIN clientes c ON ip.id_cliente = c.uuid
       WHERE ip.id = $1`,
      [result.rows[0].id]
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
      message: 'Interesse registrado com sucesso',
      data: result.rows[0]
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

/**
 * GET /api/public/imoveis/prospects
 * Lista imóveis que um cliente demonstrou interesse
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteUuid = searchParams.get('cliente_uuid')

    if (!clienteUuid) {
      return NextResponse.json(
        { success: false, message: 'UUID do cliente é obrigatório' },
        { status: 400 }
      )
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
        fi.nome as finalidade
       FROM imovel_prospects ip
       INNER JOIN imoveis i ON ip.id_imovel = i.id
       LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
       WHERE ip.id_cliente = $1 AND i.ativo = true
       ORDER BY ip.created_at DESC`,
      [clienteUuid]
    )

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    })

  } catch (error: any) {
    console.error('❌ Erro ao listar interesses:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao listar interesses', error: error.message },
      { status: 500 }
    )
  }
}

