import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { userHasPermission } from '@/lib/database/users'
import { findImovelById } from '@/lib/database/imoveis'
import { 
  findProximidadesByImovel, 
  updateImovelProximidades, 
  addProximidadeToImovel, 
  removeProximidadeFromImovel 
} from '@/lib/database/proximidades'

// Listar proximidades do imóvel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de leitura
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'READ')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    // Buscar proximidades do imóvel
    const proximidades = await findProximidadesByImovel(id)
    
    return NextResponse.json({
      success: true,
      data: proximidades
    })

  } catch (error) {
    console.error('Erro ao listar proximidades do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Atualizar proximidades do imóvel (substitui todas)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'UPDATE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { proximidades } = body

    if (!Array.isArray(proximidades)) {
      return NextResponse.json(
        { error: 'Lista de proximidades inválida' },
        { status: 400 }
      )
    }

    // Validar e processar proximidades
    const proximidadesProcessadas = proximidades.map(item => {
      if (typeof item === 'number') {
        return { proximidade_id: item }
      } else if (typeof item === 'object' && item.proximidade_id) {
        return {
          proximidade_id: parseInt(item.proximidade_id),
          distancia_metros: item.distancia_metros ? parseInt(item.distancia_metros) : undefined,
          tempo_caminhada: item.tempo_caminhada ? parseInt(item.tempo_caminhada) : undefined,
          observacoes: item.observacoes || undefined
        }
      } else {
        throw new Error('Formato de proximidade inválido')
      }
    })

    // Atualizar proximidades
    await updateImovelProximidades(id, proximidadesProcessadas)

    return NextResponse.json({
      success: true,
      message: 'Proximidades atualizadas com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar proximidades do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Adicionar proximidade ao imóvel
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'UPDATE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { proximidadeId, distanciaMetros, tempoCaminhada, observacoes } = body

    if (!proximidadeId || isNaN(parseInt(proximidadeId))) {
      return NextResponse.json(
        { error: 'ID da proximidade é obrigatório' },
        { status: 400 }
      )
    }

    // Adicionar proximidade
    const relacionamentoId = await addProximidadeToImovel(
      id, 
      parseInt(proximidadeId),
      distanciaMetros ? parseInt(distanciaMetros) : undefined,
      tempoCaminhada ? parseInt(tempoCaminhada) : undefined,
      observacoes
    )

    return NextResponse.json({
      success: true,
      message: 'Proximidade adicionada com sucesso',
      data: { id: relacionamentoId }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao adicionar proximidade ao imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Remover proximidade do imóvel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'UPDATE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const proximidadeId = searchParams.get('proximidadeId')

    if (!proximidadeId || isNaN(parseInt(proximidadeId))) {
      return NextResponse.json(
        { error: 'ID da proximidade é obrigatório' },
        { status: 400 }
      )
    }

    // Remover proximidade
    const sucesso = await removeProximidadeFromImovel(id, parseInt(proximidadeId))

    if (!sucesso) {
      return NextResponse.json(
        { error: 'Proximidade não encontrada no imóvel' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Proximidade removida com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover proximidade do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}





