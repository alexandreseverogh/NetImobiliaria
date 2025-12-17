import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentoId: string } }
) {
  try {
    const imovelId = parseInt(params.id)
    const documentoId = parseInt(params.documentoId)
    
    if (isNaN(imovelId) || isNaN(documentoId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Buscar documento específico
    const query = `
      SELECT 
        d.id,
        d.nome_arquivo,
        d.tipo_mime,
        d.tamanho_bytes,
        d.documento,
        td.descricao as tipo_documento
      FROM imovel_documentos d
      JOIN tipo_documento_imovel td ON d.id_tipo_documento = td.id
      WHERE d.id = $1 AND d.id_imovel = $2 AND td.consulta_imovel_internauta = true
    `
    
    const result = await pool.query(query, [documentoId, imovelId])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    const documento = result.rows[0]
    
    // Retornar documento como blob
    return new NextResponse(documento.documento, {
      status: 200,
      headers: {
        'Content-Type': documento.tipo_mime,
        'Content-Disposition': `inline; filename="${documento.nome_arquivo}"`,
        'Content-Length': documento.tamanho_bytes.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao buscar documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}




