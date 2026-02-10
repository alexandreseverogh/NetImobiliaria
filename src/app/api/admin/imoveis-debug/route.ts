import { NextRequest, NextResponse } from 'next/server'

// Mantenha o runtime nodejs
export const runtime = 'nodejs'

// Importe a função do banco de dados
import { listImoveis } from '@/lib/database/imoveis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const proprietario_uuid = searchParams.get('proprietario_uuid')

    // Construir filtro
    const filtros: any = {}
    if (proprietario_uuid) {
      filtros.proprietario_uuid = proprietario_uuid
    }

    // Executar query (limitando a 5 para não poluir)
    // Se o filtro funcionar, deve retornar 0 ou poucos.
    const imoveis = await listImoveis(filtros, 10, 0)

    return NextResponse.json({
      status: "DEBUG_MODE",
      received_uuid: proprietario_uuid,
      filter_object_passed_to_db: filtros,
      db_result_count: imoveis.length,
      first_item_owner: imoveis[0]?.proprietario_uuid || "N/A",
      // Retornar também o primeiro item para inspeção
      first_item: imoveis[0] || null
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "ERROR",
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
