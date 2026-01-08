/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// PUT - Atualizar imagem principal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API PUT /api/admin/imoveis/[id]/imagem-principal - INICIADA')
  
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const { imageId } = await request.json()
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'ID da imagem é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🔍 Atualizando imagem principal:', { imovelId, imageId })

    // Iniciar transação
    await pool.query('BEGIN')

    try {
      // Primeiro, definir todas as imagens do imóvel como não principais
      const updateAllResult = await pool.query(
        'UPDATE imovel_imagens SET principal = false WHERE imovel_id = $1',
        [imovelId]
      )
      console.log('🔍 Todas as imagens definidas como não principais:', updateAllResult.rowCount)

      // Depois, definir a imagem selecionada como principal
      const updatePrincipalResult = await pool.query(
        'UPDATE imovel_imagens SET principal = true WHERE id = $1 AND imovel_id = $2',
        [imageId, imovelId]
      )
      console.log('🔍 Imagem definida como principal:', updatePrincipalResult.rowCount)

      if (updatePrincipalResult.rowCount === 0) {
        throw new Error('Imagem não encontrada ou não pertence ao imóvel')
      }

      // Commit da transação
      await pool.query('COMMIT')
      console.log('✅ Imagem principal atualizada com sucesso')

      return NextResponse.json({
        success: true,
        message: 'Imagem principal atualizada com sucesso'
      })

    } catch (error) {
      // Rollback em caso de erro
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Erro ao atualizar imagem principal:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
