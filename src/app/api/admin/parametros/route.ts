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

    // Buscar valor atual
    const result = await pool.query(
      'SELECT vl_destaque_nacional FROM parametros LIMIT 1'
    )

    if (result.rows.length === 0) {
      // Se não existir registro, criar com valor padrão
      await pool.query(
        'INSERT INTO parametros (vl_destaque_nacional) VALUES (0.00)'
      )
      
      return NextResponse.json({
        success: true,
        data: { vl_destaque_nacional: 0.00 }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        vl_destaque_nacional: parseFloat(result.rows[0].vl_destaque_nacional) || 0.00
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

// PUT - Atualizar valor do parâmetro
export async function PUT(request: NextRequest) {
  try {
    // Verificar permissões
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body = await request.json()
    const { vl_destaque_nacional } = body

    // Validações
    if (vl_destaque_nacional === undefined || vl_destaque_nacional === null) {
      return NextResponse.json(
        { error: 'Valor de destaque nacional é obrigatório' },
        { status: 400 }
      )
    }

    const valorNumerico = parseFloat(vl_destaque_nacional)
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      return NextResponse.json(
        { error: 'Valor de destaque nacional deve ser um número positivo' },
        { status: 400 }
      )
    }

    // Verificar se existe registro
    const existe = await pool.query('SELECT 1 FROM parametros LIMIT 1')

    if (existe.rows.length === 0) {
      // Criar registro se não existir
      await pool.query(
        'INSERT INTO parametros (vl_destaque_nacional) VALUES ($1)',
        [valorNumerico]
      )
    } else {
      // Atualizar valor existente
      await pool.query(
        'UPDATE parametros SET vl_destaque_nacional = $1',
        [valorNumerico]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Parâmetro atualizado com sucesso',
      data: { vl_destaque_nacional: valorNumerico }
    })

  } catch (error) {
    console.error('Erro ao atualizar parâmetros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar parâmetros' },
      { status: 500 }
    )
  }
}








