import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET - Buscar valor atual do par├ómetro
export async function GET(request: NextRequest) {
  try {
    // Verificar permiss├Áes
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Buscar valores atuais
    const result = await pool.query(
      `SELECT 
        vl_destaque_nacional, 
        valor_corretor, 
        chave_pix_corretor, 
        cidade_beneficiario_recebimento_corretor, 
        valor_mensal_imovel,
        qtde_anuncios_imoveis_corretor,
        periodo_anuncio_corretor,
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead,
        valor_ticket_alto
      FROM parametros LIMIT 1`
    )

    if (result.rows.length === 0) {
      // Se não existir registro, criar com valores padrão
      await pool.query(
        `INSERT INTO parametros (
          vl_destaque_nacional, 
          valor_corretor, 
          chave_pix_corretor, 
          cidade_beneficiario_recebimento_corretor, 
          valor_mensal_imovel,
          qtde_anuncios_imoveis_corretor,
          periodo_anuncio_corretor,
          proximos_corretores_recebem_leads,
          sla_minutos_aceite_lead,
          valor_ticket_alto
        ) VALUES (0.00, 0.00, $1, $2, 0.00, 5, 30, 3, 5, 2000000.00)`,
        ['', 'BRASILIA']
      )

      return NextResponse.json({
        success: true,
        data: {
          vl_destaque_nacional: 0.00,
          valor_corretor: 0.00,
          chave_pix_corretor: '',
          cidade_beneficiario_recebimento_corretor: 'BRASILIA',
          valor_mensal_imovel: 0.00,
          qtde_anuncios_imoveis_corretor: 5,
          periodo_anuncio_corretor: 30,
          proximos_corretores_recebem_leads: 3,
          sla_minutos_aceite_lead: 5,
          valor_ticket_alto: 2000000.00
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        vl_destaque_nacional: parseFloat(result.rows[0].vl_destaque_nacional) || 0.00,
        valor_corretor: parseFloat(result.rows[0].valor_corretor) || 0.00,
        chave_pix_corretor: result.rows[0].chave_pix_corretor || '',
        cidade_beneficiario_recebimento_corretor: result.rows[0].cidade_beneficiario_recebimento_corretor || 'BRASILIA',
        valor_mensal_imovel: parseFloat(result.rows[0].valor_mensal_imovel) || 0.00,
        qtde_anuncios_imoveis_corretor: parseInt(result.rows[0].qtde_anuncios_imoveis_corretor) || 5,
        periodo_anuncio_corretor: parseInt(result.rows[0].periodo_anuncio_corretor) || 30,
        proximos_corretores_recebem_leads: parseInt(result.rows[0].proximos_corretores_recebem_leads) || 3,
        sla_minutos_aceite_lead: parseInt(result.rows[0].sla_minutos_aceite_lead) || 5,
        valor_ticket_alto: parseFloat(result.rows[0].valor_ticket_alto) || 2000000.00
      }
    })

  } catch (error) {
    console.error('Erro ao buscar parâmetros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar parâmetros' },
      { status: 500 }
    )
  }
}

interface ParametrosRequest {
  vl_destaque_nacional?: number;
  valor_corretor?: number;
  chave_pix_corretor?: string;
  cidade_beneficiario_recebimento_corretor?: string;
  valor_mensal_imovel?: number;
  qtde_anuncios_imoveis_corretor?: number;
  periodo_anuncio_corretor?: number;
  proximos_corretores_recebem_leads?: number;
  sla_minutos_aceite_lead?: number;
  valor_ticket_alto?: number;
}

// PUT - Atualizar valor do parâmetro
export async function PUT(request: NextRequest) {
  try {
    // Verificar permissões
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body: ParametrosRequest = await request.json()
    const {
      vl_destaque_nacional,
      valor_corretor,
      chave_pix_corretor,
      cidade_beneficiario_recebimento_corretor,
      valor_mensal_imovel,
      qtde_anuncios_imoveis_corretor,
      periodo_anuncio_corretor,
      proximos_corretores_recebem_leads,
      sla_minutos_aceite_lead,
      valor_ticket_alto
    } = body

    // Preparar campos e valores para atualização
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (vl_destaque_nacional !== undefined) {
      const valorNumerico = parseFloat(vl_destaque_nacional.toString())
      if (isNaN(valorNumerico) || valorNumerico < 0) {
        return NextResponse.json({ error: 'Valor de destaque nacional inválido' }, { status: 400 })
      }
      updates.push(`vl_destaque_nacional = $${paramCount++}`)
      values.push(valorNumerico)
    }

    if (valor_corretor !== undefined) {
      const valorNumerico = parseFloat(valor_corretor.toString())
      if (isNaN(valorNumerico) || valorNumerico < 0) {
        return NextResponse.json({ error: 'Valor do corretor inválido' }, { status: 400 })
      }
      updates.push(`valor_corretor = $${paramCount++}`)
      values.push(valorNumerico)
    }

    if (chave_pix_corretor !== undefined) {
      updates.push(`chave_pix_corretor = $${paramCount++}`)
      values.push(chave_pix_corretor)
    }

    if (cidade_beneficiario_recebimento_corretor !== undefined) {
      // O PIX exige cidade em maiúsculas e sem acentos para máxima compatibilidade, 
      // mas vamos apenas garantir que não seja vazia aqui.
      updates.push(`cidade_beneficiario_recebimento_corretor = $${paramCount++}`)
      values.push(cidade_beneficiario_recebimento_corretor.trim().toUpperCase())
    }

    if (valor_mensal_imovel !== undefined) {
      const valorNumerico = parseFloat(valor_mensal_imovel.toString())
      if (isNaN(valorNumerico) || valorNumerico < 0) {
        return NextResponse.json({ error: 'Valor mensal do imóvel inválido' }, { status: 400 })
      }
      updates.push(`valor_mensal_imovel = $${paramCount++}`)
      values.push(valorNumerico)
    }

    if (qtde_anuncios_imoveis_corretor !== undefined) {
      const qtde = parseInt(qtde_anuncios_imoveis_corretor.toString())
      if (isNaN(qtde) || qtde < 0) {
        return NextResponse.json({ error: 'Quantidade de anúncios inválida' }, { status: 400 })
      }
      updates.push(`qtde_anuncios_imoveis_corretor = $${paramCount++}`)
      values.push(qtde)
    }

    if (periodo_anuncio_corretor !== undefined) {
      const periodo = parseInt(periodo_anuncio_corretor.toString())
      if (isNaN(periodo) || periodo < 0) {
        return NextResponse.json({ error: 'Período de anúncio inválido' }, { status: 400 })
      }
      updates.push(`periodo_anuncio_corretor = $${paramCount++}`)
      values.push(periodo)
    }

    if (proximos_corretores_recebem_leads !== undefined) {
      const n = parseInt(proximos_corretores_recebem_leads.toString())
      if (isNaN(n) || n < 0) {
        return NextResponse.json({ error: 'Valor inválido para próximos corretores' }, { status: 400 })
      }
      updates.push(`proximos_corretores_recebem_leads = $${paramCount++}`)
      values.push(n)
    }

    if (sla_minutos_aceite_lead !== undefined) {
      const n = parseInt(sla_minutos_aceite_lead.toString())
      if (isNaN(n) || n <= 0) {
        return NextResponse.json({ error: 'Valor inválido para SLA (minutos)' }, { status: 400 })
      }
      updates.push(`sla_minutos_aceite_lead = $${paramCount++}`)
      values.push(n)
    }

    if (valor_ticket_alto !== undefined) {
      const valorNumerico = parseFloat(valor_ticket_alto.toString())
      if (isNaN(valorNumerico) || valorNumerico < 0) {
        return NextResponse.json({ error: 'Valor de ticket alto inválido' }, { status: 400 })
      }
      updates.push(`valor_ticket_alto = $${paramCount++}`)
      values.push(valorNumerico)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 })
    }

    // Verificar se existe registro
    const existe = await pool.query('SELECT 1 FROM parametros LIMIT 1')

    if (existe.rows.length === 0) {
      // Criar registro se não existir (usando apenas o que foi enviado)
      const columns = updates.map(u => u.split(' = ')[0]).join(', ')
      const placeholders = updates.map((_, i) => `$${i + 1}`).join(', ')
      await pool.query(
        `INSERT INTO parametros (${columns}) VALUES (${placeholders})`,
        values
      )
    } else {
      // Atualizar valor existente
      await pool.query(
        `UPDATE parametros SET ${updates.join(', ')}`,
        values
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Par├ómetros atualizados com sucesso',
      data: body
    })

  } catch (error) {
    console.error('Erro ao atualizar par├ómetros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar par├ómetros' },
      { status: 500 }
    )
  }
}








