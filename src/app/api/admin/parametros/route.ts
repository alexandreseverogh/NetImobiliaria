import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET - Buscar valor atual do parâmetro
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Buscar valores atuais
    const result = await pool.query(
      'SELECT vl_destaque_nacional, valor_corretor, chave_pix_corretor, cidade_beneficiario_recebimento_corretor FROM parametros LIMIT 1'
    )

    if (result.rows.length === 0) {
      // Se não existir registro, criar com valores padrão
      await pool.query(
        'INSERT INTO parametros (vl_destaque_nacional, valor_corretor, chave_pix_corretor, cidade_beneficiario_recebimento_corretor) VALUES (0.00, 0.00, $1, $2)',
        ['', 'BRASILIA']
      )
      
      return NextResponse.json({
        success: true,
        data: { 
          vl_destaque_nacional: 0.00,
          valor_corretor: 0.00,
          chave_pix_corretor: '',
          cidade_beneficiario_recebimento_corretor: 'BRASILIA'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        vl_destaque_nacional: parseFloat(result.rows[0].vl_destaque_nacional) || 0.00,
        valor_corretor: parseFloat(result.rows[0].valor_corretor) || 0.00,
        chave_pix_corretor: result.rows[0].chave_pix_corretor || '',
        cidade_beneficiario_recebimento_corretor: result.rows[0].cidade_beneficiario_recebimento_corretor || 'BRASILIA'
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
      cidade_beneficiario_recebimento_corretor 
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
      message: 'Parâmetros atualizados com sucesso',
      data: body
    })

  } catch (error) {
    console.error('Erro ao atualizar parâmetros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar parâmetros' },
      { status: 500 }
    )
  }
}








