import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Autenticação básica do corretor
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded: any = verifyTokenNode(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })
    }

    // Buscar apenas os parâmetros permitidos para o corretor
    const result = await pool.query(
      'SELECT valor_corretor, chave_pix_corretor, cidade_beneficiario_recebimento_corretor FROM parametros LIMIT 1'
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { 
          valor_corretor: 0.00,
          chave_pix_corretor: '',
          cidade_beneficiario_recebimento_corretor: 'BRASILIA'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        valor_corretor: parseFloat(result.rows[0].valor_corretor) || 0.00,
        chave_pix_corretor: result.rows[0].chave_pix_corretor || '',
        cidade_beneficiario_recebimento_corretor: result.rows[0].cidade_beneficiario_recebimento_corretor || 'BRASILIA'
      }
    })

  } catch (error) {
    console.error('Erro ao buscar parâmetros do corretor:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

